import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, DollarSign, AlertTriangle, ArrowRight } from "lucide-react"

interface Transaction {
  id: number; transaction_id: string; from_account: string; to_account: string
  amount: number; type: string; timestamp: string; is_suspicious: boolean
  suspicion_reason: string | null; is_circular: boolean; is_structured: boolean
}

interface Account {
  id: number; account_number: string; bank_name: string
  account_holder: string; criminal_id: number | null
  is_shell_account: boolean; suspicious_transactions: number
}

const FinancialCrime = () => {
  const { token } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txnRes, accRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/analytics/financial/transactions?only_suspicious=true`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/analytics/financial/accounts`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (txnRes.ok) setTransactions(await txnRes.json())
        if (accRes.ok) setAccounts(await accRes.json())
      } catch (e) { console.error(e) }
      finally { setIsLoading(false) }
    }
    fetchData()
  }, [token])

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  const totalSuspicious = transactions.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Crime Analysis</h1>
        <p className="text-muted-foreground mt-1">Transaction monitoring, money trail visualization, and suspicious pattern detection</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-red-500" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Suspicious Transactions</p><p className="text-xl font-bold">{transactions.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Shell Accounts</p><p className="text-xl font-bold">{accounts.filter(a => a.is_shell_account).length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-purple-500" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Total Suspicious Amount</p><p className="text-xl font-bold">₹{(totalSuspicious/100000).toFixed(1)}L</p></div>
        </CardContent></Card>
      </div>


      {/* Suspicious Accounts */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Suspicious Bank Accounts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Account</TableHead><TableHead>Bank</TableHead><TableHead>Holder</TableHead>
              <TableHead>Suspicious Txns</TableHead><TableHead>Flags</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {accounts.slice(0, 10).map(acc => (
                <TableRow key={acc.id}>
                  <TableCell className="font-mono text-xs">{acc.account_number}</TableCell>
                  <TableCell className="text-xs">{acc.bank_name}</TableCell>
                  <TableCell className="text-xs">{acc.account_holder}</TableCell>
                  <TableCell className="text-xs font-bold">{acc.suspicious_transactions}</TableCell>
                  <TableCell>
                    {acc.is_shell_account && <Badge variant="destructive" className="text-[9px]">Shell</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Suspicious Transactions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {transactions.slice(0, 15).map(txn => (
              <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono bg-muted px-2 py-1 rounded">{txn.from_account.slice(-6)}</div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <div className="text-xs font-mono bg-muted px-2 py-1 rounded">{txn.to_account.slice(-6)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold">₹{txn.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{txn.type}</p>
                  </div>
                  <div className="flex gap-1">
                    {txn.is_circular && <Badge variant="outline" className="text-[9px] border-red-300 text-red-700">Circular</Badge>}
                    {txn.is_structured && <Badge variant="outline" className="text-[9px] border-orange-300 text-orange-700">Structured</Badge>}
                    {txn.suspicion_reason && <Badge variant="secondary" className="text-[9px]">{txn.suspicion_reason}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FinancialCrime
