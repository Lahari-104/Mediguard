import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { AlertTriangle, Clock, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(res.data);
    } catch (error) {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/alerts/${alertId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Alert marked as read');
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'expiry_warning':
        return <Clock className="w-5 h-5" />;
      case 'low_stock':
        return <Package className="w-5 h-5" />;
      case 'quality_issue':
        return <AlertTriangle className="w-5 h-5" />;
      case 'expired_batch':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.is_read;
    if (filter === 'read') return alert.is_read;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-emerald-600 text-xl">Loading alerts...</div></div>;
  }

  return (
    <div className="space-y-6" data-testid="alerts-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">Alerts & Notifications</h1>
          <p className="text-base text-emerald-600">Stay informed about inventory issues and expiring items</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            data-testid="filter-all"
            className={filter === 'all' ? 'bg-emerald-600' : ''}
          >
            All
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
            data-testid="filter-unread"
            className={filter === 'unread' ? 'bg-emerald-600' : ''}
          >
            Unread
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'outline'}
            onClick={() => setFilter('read')}
            data-testid="filter-read"
            className={filter === 'read' ? 'bg-emerald-600' : ''}
          >
            Read
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-red-600">{alerts.filter(a => !a.is_read).length}</p>
              </div>
              <Package className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{alerts.filter(a => a.severity === 'high').length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Read</p>
                <p className="text-2xl font-bold text-emerald-600">{alerts.filter(a => a.is_read).length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center text-gray-500">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
              <p className="text-xl font-semibold">No alerts to display</p>
              <p className="text-sm mt-2">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              data-testid={`alert-${alert.id}`}
              className={`border-l-4 shadow-md hover:shadow-lg transition-shadow ${
                alert.severity === 'high' ? 'alert-high' :
                alert.severity === 'medium' ? 'alert-medium' : 'alert-low'
              } ${!alert.is_read ? 'bg-white' : 'bg-gray-50'}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${getAlertColor(alert.severity)}`}>
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{alert.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      {alert.batch_number && (
                        <p className="text-xs text-gray-500 mt-2">
                          Batch: <span className="font-mono font-medium">{alert.batch_number}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Badge className={`capitalize ${getAlertColor(alert.severity)}`}>
                      {alert.severity}
                    </Badge>
                    {!alert.is_read && (
                      <Button
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                        data-testid={`mark-read-${alert.id}`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
                  <span className="capitalize">
                    Type: {alert.alert_type.replace('_', ' ')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}