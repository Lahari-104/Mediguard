import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Package, AlertTriangle, TrendingUp, Building2, Activity, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const triggerAlertCheck = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/alerts/check`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Alert check triggered');
      setTimeout(fetchDashboardStats, 2000);
    } catch (error) {
      toast.error('Failed to trigger alert check');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-emerald-600 text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Batches',
      value: stats?.total_batches || 0,
      icon: Package,
      color: 'from-blue-500 to-cyan-600',
      testId: 'stat-batches'
    },
    {
      title: 'Inventory Items',
      value: stats?.total_inventory || 0,
      icon: Activity,
      color: 'from-emerald-500 to-teal-600',
      testId: 'stat-inventory'
    },
    {
      title: 'Manufacturers',
      value: stats?.total_manufacturers || 0,
      icon: Building2,
      color: 'from-purple-500 to-pink-600',
      testId: 'stat-manufacturers'
    },
    {
      title: 'Unread Alerts',
      value: stats?.unread_alerts || 0,
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-600',
      testId: 'stat-alerts'
    },
    {
      title: 'Expiring Soon',
      value: stats?.expiring_soon || 0,
      icon: Clock,
      color: 'from-yellow-500 to-amber-600',
      testId: 'stat-expiring'
    },
    {
      title: 'Low Stock Items',
      value: stats?.low_stock_count || 0,
      icon: TrendingUp,
      color: 'from-orange-500 to-red-600',
      testId: 'stat-low-stock'
    }
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-emerald-800 mb-2">Dashboard</h1>
          <p className="text-base lg:text-lg text-emerald-600">Monitor your inventory and compliance in real-time</p>
        </div>
        <Button
          onClick={triggerAlertCheck}
          data-testid="trigger-alert-check"
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
        >
          <Activity className="w-4 h-4 mr-2" />
          Check Alerts
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="card-animate border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid={stat.testId}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-emerald-800">System Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Quality Issues</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">{stats?.quality_issues || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Compliance Status</p>
                  <p className="text-2xl font-bold text-blue-800 mt-1">
                    {stats?.quality_issues === 0 ? 'Good' : 'Needs Attention'}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">System Health</h3>
            <p className="text-sm text-amber-700">
              {stats?.unread_alerts > 5 
                ? 'Multiple alerts require attention. Please review the Alerts section.'
                : stats?.unread_alerts > 0
                ? 'Some alerts require your attention.'
                : 'All systems operating normally. No critical alerts.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}