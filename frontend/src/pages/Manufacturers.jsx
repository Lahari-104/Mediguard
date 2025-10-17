import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Building2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function Manufacturers() {
  const [manufacturers, setManufacturers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    license_number: ''
  });

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const fetchManufacturers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/manufacturers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setManufacturers(res.data);
    } catch (error) {
      toast.error('Failed to load manufacturers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/manufacturers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Manufacturer added successfully');
      setDialogOpen(false);
      fetchManufacturers();
      setFormData({
        name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        license_number: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add manufacturer');
    }
  };

  const filteredManufacturers = manufacturers.filter(mfr =>
    mfr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mfr.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mfr.license_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-emerald-600 text-xl">Loading manufacturers...</div></div>;
  }

  return (
    <div className="space-y-6" data-testid="manufacturers-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">Manufacturers</h1>
          <p className="text-base text-emerald-600">Manage supplier and manufacturer information</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white" data-testid="add-manufacturer-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Manufacturer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Manufacturer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  data-testid="manufacturer-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  data-testid="contact-email-input"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  data-testid="contact-phone-input"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  data-testid="address-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input
                  data-testid="license-number-input"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="submit-manufacturer-button">
                Add Manufacturer
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
              placeholder="Search manufacturers..."
              data-testid="search-manufacturers-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredManufacturers.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No manufacturers found
              </div>
            ) : (
              filteredManufacturers.map((mfr) => (
                <Card key={mfr.id} className="hover:shadow-lg transition-shadow" data-testid={`manufacturer-card-${mfr.id}`}>
                  <CardHeader>
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{mfr.name}</h3>
                        <p className="text-sm text-gray-500">License: {mfr.license_number}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{mfr.contact_email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{mfr.contact_phone}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      <p className="font-medium">Address:</p>
                      <p className="text-xs">{mfr.address}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}