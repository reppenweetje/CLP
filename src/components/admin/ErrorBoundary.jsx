import { Component } from 'react'

// Vangt render-errors in een admin-sectie op zodat een crash in één
// onderdeel niet de hele /admin-pagina blanco maakt. Geeft een rood
// foutkaartje in plaats van de geplande sectie; de andere secties
// blijven werken.
//
// Gebruik:
//   <ErrorBoundary label="Sankey">
//     <SankeyFlow sessions={sessions} />
//   </ErrorBoundary>
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[AdminErrorBoundary] ' + (this.props.label || 'section'), error, info)
  }

  render() {
    if (this.state.hasError) {
      const msg = String(this.state.error?.message || 'onbekende fout')
      return (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="text-[11px] tracking-[0.18em] text-rose-700 uppercase font-medium mb-1">
            Sectie-fout
          </div>
          <div className="text-[15px] font-semibold text-ink mb-2">
            {this.props.label || 'Een onderdeel'} kon niet renderen
          </div>
          <div className="text-[13px] text-rose-800 leading-relaxed">
            <code className="bg-paper px-1.5 py-0.5 rounded">{msg}</code>
          </div>
          <div className="text-[12px] text-ink-soft mt-3">
            De rest van de admin blijft wel werken. Bij weinig data is dit vaak een
            edge-case; vul je dataset aan en refresh.
          </div>
        </section>
      )
    }
    return this.props.children
  }
}
