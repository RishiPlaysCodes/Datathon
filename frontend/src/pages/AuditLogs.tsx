import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, User, Activity, Clock } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/crime/logs`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(data);
        }
      } catch (error) {
        console.error('Failed to fetch logs', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Complete trail of all system activities and record accesses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            System Activity Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                         <User className="w-3 h-3 text-muted-foreground" />
                         <span>User ID: {log.user_id}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{log.entity_name}</span>
                        <span className="text-[10px] text-muted-foreground">ID: {log.entity_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    {isLoading ? "Loading activity logs..." : "No audit logs found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
