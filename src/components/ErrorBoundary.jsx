import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ background: 'var(--bg)', color: 'var(--ink-3)' }}
        >
          <div
            className="rounded-2xl p-8 max-w-md w-full text-center shadow-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>
              Terjadi Kesalahan
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
              Maaf, aplikasi mengalami masalah. Silakan muat ulang halaman.
            </p>
            {this.state.error?.message && (
              <pre
                className="rounded-lg p-3 text-xs text-left mb-6 overflow-auto max-h-32"
                style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
              >
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleReset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Muat Ulang
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
