import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    batch_number: '',
    product_name: '',
    product_type: 'drug',
    manufacturer_id: '',
    production_date: '',
    expiry_date: '',
    quantity: ''
  });

  useEffect(() => {
    fetchBatches();
    fetchManufacturers();
  }, []);

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/batches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatches(res.data);
    } catch (error) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/manufacturers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setManufacturers(res.data);
    } catch (error) {
      console.error('Failed to load manufacturers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        production_date: new Date(formData.production_date).toISOString(),
        expiry_date: new Date(formData.expiry_date).toISOString(),
        quantity: parseInt(formData.quantity)
      };
      
      await axios.post(`${API}/batches`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Batch created successfully');
      setDialogOpen(false);
      fetchBatches();
      setFormData({
        batch_number: '',
        product_name: '',
        product_type: 'drug',
        manufacturer_id: '',
        production_date: '',
        expiry_date: '',
        quantity: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create batch');
    }
  };

  const filteredBatches = batches.filter(batch =>
    batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.manufacturer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-emerald-600 text-xl">Loading batches...</div></div>;
  }

  return (
    <div className="space-y-6" data-testid="batches-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">Batch Management</h1>
          <p className="text-base text-emerald-600">Track batches from production to hospital use</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white" data-testid="add-batch-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch Number</Label>
                  <Input
                    data-testid="batch-number-input"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    data-testid="product-name-input"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Type</Label>
                  <select
                    data-testid="product-type-select"
                    value={formData.product_type}
                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="drug">Drug</option>
                    <option value="consumable">Consumable</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <select
                    data-testid="manufacturer-select"
                    value={formData.manufacturer_id}
                    onChange={(e) => setFormData({ ...formData, manufacturer_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">Select Manufacturer</option>
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Production Date</Label>
                  <Input
                    type="date"
                    data-testid="production-date-input"
                    value={formData.production_date}
                    onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    data-testid="expiry-date-input"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  data-testid="quantity-input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="submit-batch-button">
                Create Batch
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
              placeholder="Search by batch number, product, or manufacturer..."
              data-testid="search-batches-input"
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
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Production Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No batches found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches.map((batch) => (
                    <TableRow key={batch.id} data-testid={`batch-row-${batch.id}`}>
                      <TableCell className="font-medium">{batch.batch_number}</TableCell>
                      <TableCell>{batch.product_name}</TableCell>
                      <TableCell className="capitalize">{batch.product_type}</TableCell>
                      <TableCell>{batch.manufacturer_name}</TableCell>
                      <TableCell>{new Date(batch.production_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(batch.expiry_date).toLocaleDateString()}</TableCell>
                      <TableCell>{batch.quantity}</TableCell>
                      <TableCell>
                        <span className={`status-badge status-${batch.status}`}>
                          {batch.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`status-badge status-${batch.quality_status}`}>
                          {batch.quality_status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}