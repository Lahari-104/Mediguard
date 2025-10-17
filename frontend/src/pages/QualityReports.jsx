import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, FileCheck, FileX, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function QualityReports() {
  const [reports, setReports] = useState([]);
  const [batches, setBatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    batch_id: '',
    test_type: '',
    result: 'pending',
    notes: '',
    tested_by: ''
  });

  useEffect(() => {
    fetchReports();
    fetchBatches();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/quality-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data);
    } catch (error) {
      toast.error('Failed to load quality reports');
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
      await axios.post(`${API}/quality-reports`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Quality report created successfully');
      if (formData.result === 'failed') {
        toast.warning('Quality alert sent to staff members');
      }
      setDialogOpen(false);
      fetchReports();
      setFormData({
        batch_id: '',
        test_type: '',
        result: 'pending',
        notes: '',
        tested_by: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create report');
    }
  };

  const filteredReports = reports.filter(report =>
    report.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.test_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getResultIcon = (result) => {
    switch (result) {
      case 'passed':
        return <FileCheck className="w-5 h-5 text-emerald-600" />;
      case 'failed':
        return <FileX className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-emerald-600 text-xl">Loading quality reports...</div></div>;
  }

  return (
    <div className="space-y-6" data-testid="quality-reports-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">Quality Reports</h1>
          <p className="text-base text-emerald-600">Track quality test results and compliance</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white" data-testid="add-report-button">
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Quality Report</DialogTitle>
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
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} - {b.product_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Test Type</Label>
                  <Input
                    data-testid="test-type-input"
                    value={formData.test_type}
                    onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                    placeholder="e.g., Purity Test, Contamination Check"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Result</Label>
                  <select
                    data-testid="result-select"
                    value={formData.result}
                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Tested By</Label>
                <Input
                  data-testid="tested-by-input"
                  value={formData.tested_by}
                  onChange={(e) => setFormData({ ...formData, tested_by: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  data-testid="notes-textarea"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="submit-report-button">
                Create Report
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
              placeholder="Search by product, batch, or test type..."
              data-testid="search-reports-input"
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
                  <TableHead>Test Type</TableHead>
                  <TableHead>Test Date</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Tested By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No quality reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id} data-testid={`report-row-${report.id}`}>
                      <TableCell className="font-medium">{report.product_name}</TableCell>
                      <TableCell>{report.batch_number}</TableCell>
                      <TableCell>{report.test_type}</TableCell>
                      <TableCell>{new Date(report.test_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getResultIcon(report.result)}
                          <span className={`status-badge status-${report.result}`}>
                            {report.result}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{report.tested_by}</TableCell>
                      <TableCell className="max-w-xs truncate">{report.notes}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-700">Passed Tests</h3>
              <FileCheck className="w-8 h-8 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              {reports.filter(r => r.result === 'passed').length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-700">Failed Tests</h3>
              <FileX className="w-8 h-8 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {reports.filter(r => r.result === 'failed').length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-700">Pending Tests</h3>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {reports.filter(r => r.result === 'pending').length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}