import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Users, AlertTriangle } from 'lucide-react';

const CriminalNetwork = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Criminal Network Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Visualizing associations between criminals, suspects, and crime incidents.
        </p>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-0">
          <div className="relative h-[600px] bg-slate-50 dark:bg-slate-950 overflow-hidden flex items-center justify-center">
            {/* Mock Graph Placeholder */}
            <div className="absolute inset-0 opacity-10">
               {/* Decorative background representing a grid/network */}
               <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>
            
            <div className="z-10 text-center p-8 max-w-lg">
              <div className="relative inline-block mb-6">
                <Share2 className="w-20 h-20 text-primary animate-pulse" />
                <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> High Synergy
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Network Relationship Graph</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Indexing complex associations from 1,000+ FIRs. Using graph-based modeling to identify gang leadership and recidivism patterns.
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Nodes', value: '450' },
                  { label: 'Edges', value: '1.2k' },
                  { label: 'Communities', value: '12' }
                ].map((stat, i) => (
                  <div key={i} className="bg-background/80 border p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground uppercase font-bold">{stat.label}</div>
                    <div className="text-lg font-bold text-primary">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Legend */}
            <div className="absolute bottom-6 left-6 bg-background/90 backdrop-blur border p-4 rounded-lg shadow-lg">
              <div className="text-xs font-bold mb-3 uppercase">Legend</div>
              <div className="space-y-2">
                {[
                  { color: 'bg-red-500', label: 'Primary Suspect' },
                  { color: 'bg-blue-500', label: 'Associate' },
                  { color: 'bg-amber-500', label: 'Witness' },
                  { color: 'bg-slate-400', label: 'Incident' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CriminalNetwork;
