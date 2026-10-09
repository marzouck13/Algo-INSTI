import ErrorPanel from './ErrorPanel.jsx';

export default function ErrorsPage({ errors, onSelectLine }) {
  return (
    <div className="page page-errors">
      <ErrorPanel errors={errors} onSelectLine={onSelectLine} />
    </div>
  );
}