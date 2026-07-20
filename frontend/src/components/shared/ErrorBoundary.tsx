import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
  error?: Error
}

/**
 * Global Error Boundary - prevents the entire app from white-screening
 * if any component throws. Shows a graceful recovery UI instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // In production this would report to a logging service
    console.error('PRAHARI ErrorBoundary caught:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-sm text-gray-400 mt-2">
              An unexpected error occurred in this view. Your data is safe. You can retry or return to the Command Center.
            </p>
            {this.state.error && (
              <p className="text-[10px] text-gray-600 mt-3 font-mono bg-dark-900/60 rounded p-2 break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={this.handleReset} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <button onClick={() => { window.location.href = '/command-center' }} className="btn-secondary flex-1 py-2.5">
                Command Center
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
