from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Hospital Inventory Tracking System")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= ENUMS =============
class UserRole(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"
    MANUFACTURER = "manufacturer"

class BatchStatus(str, Enum):
    IN_PRODUCTION = "in_production"
    IN_TRANSIT = "in_transit"
    IN_STOCK = "in_stock"
    EXPIRED = "expired"
    DEPLETED = "depleted"

class QualityStatus(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"

class AlertType(str, Enum):
    EXPIRY_WARNING = "expiry_warning"
    LOW_STOCK = "low_stock"
    QUALITY_ISSUE = "quality_issue"
    EXPIRED_BATCH = "expired_batch"

# ============= MODELS =============
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password_hash: str
    role: UserRole
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Manufacturer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    contact_email: EmailStr
    contact_phone: str
    address: str
    license_number: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Batch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_number: str
    product_name: str
    product_type: str  # drug or consumable
    manufacturer_id: str
    manufacturer_name: str
    production_date: datetime
    expiry_date: datetime
    quantity: int
    status: BatchStatus
    quality_status: QualityStatus = QualityStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Inventory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_id: str
    batch_number: str
    product_name: str
    current_stock: int
    initial_stock: int
    expiry_date: datetime
    location: str
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QualityReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_id: str
    batch_number: str
    product_name: str
    test_date: datetime
    test_type: str
    result: QualityStatus
    notes: str
    tested_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alert_type: AlertType
    title: str
    message: str
    batch_id: Optional[str] = None
    batch_number: Optional[str] = None
    severity: str  # low, medium, high
    is_read: bool = False
    email_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============= INPUT MODELS =============
class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class ManufacturerInput(BaseModel):
    name: str
    contact_email: EmailStr
    contact_phone: str
    address: str
    license_number: str

class BatchInput(BaseModel):
    batch_number: str
    product_name: str
    product_type: str
    manufacturer_id: str
    production_date: datetime
    expiry_date: datetime
    quantity: int

class InventoryInput(BaseModel):
    batch_id: str
    location: str
    initial_stock: int

class QualityReportInput(BaseModel):
    batch_id: str
    test_type: str
    result: QualityStatus
    notes: str
    tested_by: str

class StockUpdateInput(BaseModel):
    quantity_change: int

# ============= HELPER FUNCTIONS =============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=int(os.getenv('JWT_EXPIRATION_DAYS', 7)))
    payload = {'user_id': user_id, 'exp': exp}
    return jwt.encode(payload, os.getenv('JWT_SECRET'), algorithm=os.getenv('JWT_ALGORITHM'))

async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    token = None
    if authorization and authorization.startswith('Bearer '):
        token = authorization.replace('Bearer ', '')
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=[os.getenv('JWT_ALGORITHM')])
        user_id = payload.get('user_id')
        user_doc = await db.users.find_one({'id': user_id}, {'_id': 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def send_alert_email(to_email: str, subject: str, message: str):
    try:
        mail = Mail(
            from_email=os.getenv('SENDER_EMAIL'),
            to_emails=to_email,
            subject=subject,
            html_content=f"<html><body><h2>Hospital Inventory Alert</h2><p>{message}</p></body></html>"
        )
        sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        response = sg.send(mail)
        logger.info(f"Email sent to {to_email}: {response.status_code}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

async def check_and_create_alerts():
    """Background task to check inventory and create alerts"""
    try:
        # Check for expiring batches (within 30 days)
        thirty_days_from_now = datetime.now(timezone.utc) + timedelta(days=30)
        expiring_batches = await db.inventory.find({
            'expiry_date': {'$lte': thirty_days_from_now.isoformat(), '$gte': datetime.now(timezone.utc).isoformat()}
        }).to_list(1000)
        
        for inv in expiring_batches:
            existing_alert = await db.alerts.find_one({
                'batch_id': inv['batch_id'],
                'alert_type': AlertType.EXPIRY_WARNING
            })
            if not existing_alert:
                alert = Alert(
                    alert_type=AlertType.EXPIRY_WARNING,
                    title="Batch Expiring Soon",
                    message=f"{inv['product_name']} (Batch: {inv['batch_number']}) expires soon",
                    batch_id=inv['batch_id'],
                    batch_number=inv['batch_number'],
                    severity="medium"
                )
                alert_dict = alert.model_dump()
                alert_dict['created_at'] = alert_dict['created_at'].isoformat()
                await db.alerts.insert_one(alert_dict)
        
        # Check for low stock (less than 10% of initial stock)
        low_stock_items = await db.inventory.find({}).to_list(1000)
        for inv in low_stock_items:
            if inv['current_stock'] < inv['initial_stock'] * 0.1:
                existing_alert = await db.alerts.find_one({
                    'batch_id': inv['batch_id'],
                    'alert_type': AlertType.LOW_STOCK
                })
                if not existing_alert:
                    alert = Alert(
                        alert_type=AlertType.LOW_STOCK,
                        title="Low Stock Alert",
                        message=f"Low stock for {inv['product_name']} (Batch: {inv['batch_number']})",
                        batch_id=inv['batch_id'],
                        batch_number=inv['batch_number'],
                        severity="high"
                    )
                    alert_dict = alert.model_dump()
                    alert_dict['created_at'] = alert_dict['created_at'].isoformat()
                    await db.alerts.insert_one(alert_dict)
        
        logger.info("Alert check completed")
    except Exception as e:
        logger.error(f"Error in alert check: {str(e)}")

# ============= AUTH ENDPOINTS =============
@api_router.post("/auth/register")
async def register(input: RegisterInput):
    existing = await db.users.find_one({'email': input.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=input.email,
        name=input.name,
        password_hash=hash_password(input.password),
        role=input.role
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}}

@api_router.post("/auth/login")
async def login(input: LoginInput):
    user_doc = await db.users.find_one({'email': input.email}, {'_id': 0})
    if not user_doc or not verify_password(input.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_doc)
    token = create_token(user.id)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role}

# ============= MANUFACTURER ENDPOINTS =============
@api_router.get("/manufacturers", response_model=List[Manufacturer])
async def get_manufacturers(current_user: User = Depends(get_current_user)):
    manufacturers = await db.manufacturers.find({}, {'_id': 0}).to_list(1000)
    for m in manufacturers:
        if isinstance(m.get('created_at'), str):
            m['created_at'] = datetime.fromisoformat(m['created_at'])
    return manufacturers

@api_router.post("/manufacturers", response_model=Manufacturer)
async def create_manufacturer(input: ManufacturerInput, current_user: User = Depends(get_current_user)):
    manufacturer = Manufacturer(**input.model_dump())
    m_dict = manufacturer.model_dump()
    m_dict['created_at'] = m_dict['created_at'].isoformat()
    await db.manufacturers.insert_one(m_dict)
    return manufacturer

# ============= BATCH ENDPOINTS =============
@api_router.get("/batches", response_model=List[Batch])
async def get_batches(current_user: User = Depends(get_current_user)):
    batches = await db.batches.find({}, {'_id': 0}).to_list(1000)
    for b in batches:
        for field in ['created_at', 'production_date', 'expiry_date']:
            if isinstance(b.get(field), str):
                b[field] = datetime.fromisoformat(b[field])
    return batches

@api_router.post("/batches", response_model=Batch)
async def create_batch(input: BatchInput, current_user: User = Depends(get_current_user)):
    manufacturer = await db.manufacturers.find_one({'id': input.manufacturer_id}, {'_id': 0})
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    
    batch = Batch(
        **input.model_dump(),
        manufacturer_name=manufacturer['name'],
        status=BatchStatus.IN_PRODUCTION
    )
    
    batch_dict = batch.model_dump()
    for field in ['created_at', 'production_date', 'expiry_date']:
        batch_dict[field] = batch_dict[field].isoformat()
    
    await db.batches.insert_one(batch_dict)
    return batch

# ============= INVENTORY ENDPOINTS =============
@api_router.get("/inventory", response_model=List[Inventory])
async def get_inventory(current_user: User = Depends(get_current_user)):
    inventory = await db.inventory.find({}, {'_id': 0}).to_list(1000)
    for inv in inventory:
        for field in ['last_updated', 'expiry_date']:
            if isinstance(inv.get(field), str):
                inv[field] = datetime.fromisoformat(inv[field])
    return inventory

@api_router.post("/inventory", response_model=Inventory)
async def create_inventory(input: InventoryInput, current_user: User = Depends(get_current_user)):
    batch = await db.batches.find_one({'id': input.batch_id}, {'_id': 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    inventory = Inventory(
        batch_id=input.batch_id,
        batch_number=batch['batch_number'],
        product_name=batch['product_name'],
        current_stock=input.initial_stock,
        initial_stock=input.initial_stock,
        expiry_date=datetime.fromisoformat(batch['expiry_date']) if isinstance(batch['expiry_date'], str) else batch['expiry_date'],
        location=input.location
    )
    
    inv_dict = inventory.model_dump()
    inv_dict['last_updated'] = inv_dict['last_updated'].isoformat()
    inv_dict['expiry_date'] = inv_dict['expiry_date'].isoformat()
    await db.inventory.insert_one(inv_dict)
    
    # Update batch status
    await db.batches.update_one({'id': input.batch_id}, {'$set': {'status': BatchStatus.IN_STOCK}})
    
    return inventory

@api_router.put("/inventory/{inventory_id}/stock")
async def update_stock(inventory_id: str, input: StockUpdateInput, current_user: User = Depends(get_current_user)):
    inventory = await db.inventory.find_one({'id': inventory_id}, {'_id': 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    new_stock = inventory['current_stock'] + input.quantity_change
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    await db.inventory.update_one(
        {'id': inventory_id},
        {'$set': {'current_stock': new_stock, 'last_updated': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Stock updated", "new_stock": new_stock}

# ============= QUALITY REPORT ENDPOINTS =============
@api_router.get("/quality-reports", response_model=List[QualityReport])
async def get_quality_reports(current_user: User = Depends(get_current_user)):
    reports = await db.quality_reports.find({}, {'_id': 0}).to_list(1000)
    for r in reports:
        for field in ['test_date', 'created_at']:
            if isinstance(r.get(field), str):
                r[field] = datetime.fromisoformat(r[field])
    return reports

@api_router.post("/quality-reports", response_model=QualityReport)
async def create_quality_report(input: QualityReportInput, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    batch = await db.batches.find_one({'id': input.batch_id}, {'_id': 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    report = QualityReport(
        batch_id=input.batch_id,
        batch_number=batch['batch_number'],
        product_name=batch['product_name'],
        test_date=datetime.now(timezone.utc),
        test_type=input.test_type,
        result=input.result,
        notes=input.notes,
        tested_by=input.tested_by
    )
    
    report_dict = report.model_dump()
    for field in ['test_date', 'created_at']:
        report_dict[field] = report_dict[field].isoformat()
    
    await db.quality_reports.insert_one(report_dict)
    await db.batches.update_one({'id': input.batch_id}, {'$set': {'quality_status': input.result}})
    
    # Create alert if quality test failed
    if input.result == QualityStatus.FAILED:
        alert = Alert(
            alert_type=AlertType.QUALITY_ISSUE,
            title="Quality Test Failed",
            message=f"Quality test failed for {batch['product_name']} (Batch: {batch['batch_number']})",
            batch_id=input.batch_id,
            batch_number=batch['batch_number'],
            severity="high"
        )
        alert_dict = alert.model_dump()
        alert_dict['created_at'] = alert_dict['created_at'].isoformat()
        await db.alerts.insert_one(alert_dict)
        
        # Send email to staff
        staff_users = await db.users.find({'role': UserRole.STAFF}, {'_id': 0}).to_list(1000)
        for staff in staff_users:
            background_tasks.add_task(send_alert_email, staff['email'], "Quality Issue Alert", alert.message)
    
    return report

# ============= ALERT ENDPOINTS =============
@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(current_user: User = Depends(get_current_user)):
    alerts = await db.alerts.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    for a in alerts:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    return alerts

@api_router.put("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str, current_user: User = Depends(get_current_user)):
    await db.alerts.update_one({'id': alert_id}, {'$set': {'is_read': True}})
    return {"message": "Alert marked as read"}

@api_router.post("/alerts/check")
async def trigger_alert_check(background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    background_tasks.add_task(check_and_create_alerts)
    return {"message": "Alert check triggered"}

# ============= DASHBOARD ENDPOINTS =============
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_batches = await db.batches.count_documents({})
    total_inventory = await db.inventory.count_documents({})
    total_manufacturers = await db.manufacturers.count_documents({})
    unread_alerts = await db.alerts.count_documents({'is_read': False})
    
    # Expiring soon (within 30 days)
    thirty_days_from_now = datetime.now(timezone.utc) + timedelta(days=30)
    expiring_soon = await db.inventory.count_documents({
        'expiry_date': {'$lte': thirty_days_from_now.isoformat(), '$gte': datetime.now(timezone.utc).isoformat()}
    })
    
    # Low stock count
    all_inventory = await db.inventory.find({}, {'_id': 0}).to_list(1000)
    low_stock_count = sum(1 for inv in all_inventory if inv['current_stock'] < inv['initial_stock'] * 0.1)
    
    # Quality issues
    quality_issues = await db.batches.count_documents({'quality_status': QualityStatus.FAILED})
    
    return {
        "total_batches": total_batches,
        "total_inventory": total_inventory,
        "total_manufacturers": total_manufacturers,
        "unread_alerts": unread_alerts,
        "expiring_soon": expiring_soon,
        "low_stock_count": low_stock_count,
        "quality_issues": quality_issues
    }

@api_router.get("/dashboard/batch-traceability/{batch_id}")
async def get_batch_traceability(batch_id: str, current_user: User = Depends(get_current_user)):
    batch = await db.batches.find_one({'id': batch_id}, {'_id': 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    inventory = await db.inventory.find_one({'batch_id': batch_id}, {'_id': 0})
    quality_reports = await db.quality_reports.find({'batch_id': batch_id}, {'_id': 0}).to_list(100)
    manufacturer = await db.manufacturers.find_one({'id': batch['manufacturer_id']}, {'_id': 0})
    
    return {
        "batch": batch,
        "inventory": inventory,
        "quality_reports": quality_reports,
        "manufacturer": manufacturer
    }

# ============= ROOT ENDPOINT =============
@api_router.get("/")
async def root():
    return {"message": "Hospital Inventory Tracking System API"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()