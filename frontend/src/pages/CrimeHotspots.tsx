import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Info } from 'lucide-react';

const CrimeHotspots = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crime Hotspots</h1>
        <p className="text-muted-foreground mt-1">
          Geospatial visualization of crime density across Karnataka.
        </p>
      </div>

      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-0">
          <div className="relative h-[600px] bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
            {/* Mock Map Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
              <MapPin className="w-16 h-16 text-primary/20 mb-4 animate-bounce" />
              <h2 className="text-2xl font-bold text-slate-400">Interactive Hotspot Map</h2>
              <p className="text-slate-500 max-w-md mt-2">
                Integrating with Google Maps API and GeoServer to provide real-time cluster visualization of registered FIRs.
              </p>
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                {[1, 2, 3, 4].map(i => (
                   <div key={i} className="p-4 bg-background/50 backdrop-blur rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                      <div className="text-xs font-bold text-muted-foreground uppercase">Region {i}</div>
                      <div className="text-xl font-bold text-primary">High Risk</div>
                   </div>
                ))}
              </div>
            </div>
            
            {/* Mock Overlay UI */}
            <div className="absolute top-4 right-4 w-64 space-y-4">
              <div className="bg-background/90 backdrop-blur p-4 rounded-lg shadow-lg border">
                <div className="font-bold text-sm mb-2">Map Layers</div>
                <div className="space-y-2">
                   {['Heatmap', 'Station Boundaries', 'Incident Points', 'Night Patrol Routes'].map(layer => (
                     <label key={layer} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                        {layer}
                     </label>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold mb-1">Data Disclaimer</p>
          <p>Hotspot data is generated based on registered FIR coordinates. Areas with limited mobile connectivity may show lower density than actual crime rates.</p>
        </div>
      </div>
    </div>
  );
};

export default CrimeHotspots;
