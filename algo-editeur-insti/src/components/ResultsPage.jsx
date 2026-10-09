import Console from './Console.jsx';
import VariablesPanel from './VariablesPanel.jsx';

export default function ResultsPage({ lines, pendingInput, onSubmitInput, variables }) {
  return (
    <div className="page page-results">
      <div className="page-results-console">
        <Console
          lines={lines}
          pendingInput={pendingInput}
          onSubmitInput={onSubmitInput}
        />
      </div>
      <div className="page-results-vars">
        <VariablesPanel variables={variables} />
      </div>
    </div>
  );
}