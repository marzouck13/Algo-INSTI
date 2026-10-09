import { formatValue } from '../interpreter/builtins.js';
import { typeLabel } from '../interpreter/types.js';

export default function VariablesPanel({ variables }) {
  return (
    <section className="panel">
      <header className="panel-header">
        Variables {variables.length > 0 && <span className="badge">{variables.length}</span>}
      </header>
      <div className="panel-body var-body">
        {variables.length === 0 && (
          <div className="placeholder">Aucune variable.</div>
        )}
        {variables.length > 0 && (
          <table className="var-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Valeur</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((v) => (
                <tr key={v.name}>
                  <td className="var-name">{v.name}</td>
                  <td className="var-type">
                    {v.rawType ? typeLabel(v.rawType) : v.type}
                  </td>
                  <td className="var-value">{formatValue(v.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}