import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    batch_id: '',
    location: '',
    initial_stock: ''
  });
  const [stockUpdate, setStockUpdate] = useState({ quantity_change: '' });

  useEffect(() => {
    fetchInventory();
    fetchBatches();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(res.data);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/batches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatches(res.data);
    } catch (error) {
      console.error('Failed to load batches');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        initial_stock: parseInt(formData.initial_stock)
      };
      
      await axios.post(`${API}/inventory`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Inventory item added successfully');
      setDialogOpen(false);
      fetchInventory();
      setFormData({ batch_id: '', location: '', initial_stock: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add inventory');
    }
  };

  const handleStockUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/inventory/${selectedInventory.id}/stock`,
        { quantity_change: parseInt(stockUpdate.quantity_change) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Stock updated successfully');
      setUpdateDialogOpen(false);
      setSelectedInventory(null);
      setStockUpdate({ quantity_change: '' });
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update stock');
    }
  };

  const openUpdateDialog = (item) => {
    setSelectedInventory(item);
    setUpdateDialogOpen(true);
  };

  const filteredInventory = inventory.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockPercentage = (current, initial) => {
    return Math.round((current / initial) * 100);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-emerald-600 text-xl">Loading inventory...</div></div>;
  }

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">Inventory Management</h1>
          <p className="text-base text-emerald-600">Monitor stock levels and manage hospital inventory</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white" data-testid="add-inventory-button">
              <Plus className="w-4 h-4 mr-2" />
              Add to Inventory
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Batch</Label>
                <select
                  data-testid="batch-select"
                  value={formData.batch_id}
                  onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select Batch</option>
                  {batches.filter(b => b.status === 'in_production' || b.status === 'in_transit').map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} - {b.product_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  data-testid="location-input"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Ward A, Storage Room 3"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  data-testid="initial-stock-input"
                  value={formData.initial_stock}
                  onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="submit-inventory-button">
                Add Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by product, batch, or location..."
              data-testid="search-inventory-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Initial Stock</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => {
                    const percentage = getStockPercentage(item.current_stock, item.initial_stock);
                    const isLowStock = percentage < 10;
                    return (
                      <TableRow key={item.id} data-testid={`inventory-row-${item.id}`}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.batch_number}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell className={isLowStock ? 'text-red-600 font-bold' : ''}>
                          {item.current_stock}
                        </TableCell>
                        <TableCell>{item.initial_stock}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  percentage > 50 ? 'bg-emerald-500' :
                                  percentage > 20 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(item.expiry_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => openUpdateDialog(item)}
                            data-testid={`update-stock-button-${item.id}`}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Update Stock
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Update Stock Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
          </DialogHeader>
          {selectedInventory && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-600">Product</p>
                <p className="font-semibold text-emerald-800">{selectedInventory.product_name}</p>
                <p className="text-sm text-emerald-600 mt-2">Current Stock</p>
                <p className="font-semibold text-emerald-800">{selectedInventory.current_stock}</p>
              </div>
              
              <form onSubmit={handleStockUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Quantity Change</Label>
                  <Input
                    type="number"
                    data-testid="quantity-change-input"
                    value={stockUpdate.quantity_change}
                    onChange={(e) => setStockUpdate({ quantity_change: e.target.value })}
                    placeholder="Enter positive to add, negative to subtract"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Example: +50 to add 50 units, -20 to remove 20 units
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStockUpdate({ quantity_change: '10' })}
                    className="flex-1"
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +10
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStockUpdate({ quantity_change: '-10' })}
                    className="flex-1"
                  >
                    <TrendingDown className="w-4 h-4 mr-1" />
                    -10
                  </Button>
                </div>
                
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-stock-update">
                  Confirm Update
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}