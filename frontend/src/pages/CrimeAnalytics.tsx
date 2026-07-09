import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CrimeAnalytics = () => {
  const [districtData, setDistrictData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [distResponse, catResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/crime/stats/districts`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/crime/stats/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (distResponse.ok && catResponse.ok) {
          setDistrictData(await distResponse.json());
          setCategoryData(await catResponse.json());
        }
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crime Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Statistical overview of crime patterns across the state.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crime Distribution by District</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Crime Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs mt-4">
                 {categoryData.map((item, i) => (
                   <div key={i} className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                     <span className="font-medium">{item.name}</span>
                     <span className="text-muted-foreground">{item.value}</span>
                   </div>
                 ))}
              </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Crime Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={districtData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrimeAnalytics;
