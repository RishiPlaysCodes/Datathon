import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, FileText, MapPin, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CrimeSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Semantic Crime Search</h1>
        <p className="text-muted-foreground mt-1">
          Search across FIRs and records using natural language.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. 'Thefts involving silver jewelry in Bangalore North' or 'Recent homicide cases with similar MO'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 bg-background border-primary/20 focus-visible:ring-primary"
              />
            </div>
            <Button type="submit" size="lg" disabled={isLoading} className="h-12 px-8">
              {isLoading ? <Loader2 className="animate-spin" /> : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {results.length > 0 ? (
          results.map((result) => (
            <Card key={result.id} className="group hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {result.metadata.fir_number}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date().toLocaleDateString()} {/* Mock date */}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Karnataka
                      </span>
                    </div>
                  </div>
                  <Badge variant={result.metadata.status === 'open' ? 'destructive' : 'secondary'}>
                    {result.metadata.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                  {result.document}
                </p>
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Confidence: {(1 - result.distance).toFixed(2)}
                  </div>
                  <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform">
                    View Details <ArrowRight className="ml-2 w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : !isLoading && (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No search results</h3>
            <p className="text-sm text-muted-foreground/60">Enter a query to find matching crime records.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrimeSearch;
