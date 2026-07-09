import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const AssignedCases = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    const fetchCases = async () => {
      try {
        // In a real app, we would filter by officer_id on the backend
        const response = await fetch(`${import.meta.env.VITE_API_URL}/crime/firs?limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCases(data);
        }
      } catch (error) {
        console.error('Failed to fetch cases', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCases();
  }, [token]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assigned Cases</h1>
        <p className="text-muted-foreground mt-1">
          List of FIRs currently assigned to you for investigation.
        </p>
      </div>

      <div className="grid gap-4">
        {cases.length > 0 ? (
          cases.map((c) => (
            <Card key={c.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {c.fir_number}
                      </Badge>
                      <Badge variant={c.status === 'open' ? 'destructive' : 'secondary'}>
                        {c.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg">{c.location}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">
                      {c.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Incident: {new Date(c.incident_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Registered: {new Date(c.registration_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Link 
                      to={`/firs/${c.id}`} 
                      className="inline-flex items-center justify-center h-10 px-6 font-medium tracking-wide text-white transition duration-200 rounded shadow-md bg-primary hover:bg-primary/90 focus:shadow-outline focus:outline-none"
                    >
                      Investigate
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
             {isLoading ? "Loading your assignments..." : "No cases assigned to you."}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignedCases;
