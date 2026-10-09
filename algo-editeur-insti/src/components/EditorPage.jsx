import Editor from './Editor.jsx';

export default function EditorPage({ code, onChange, focusTarget, theme }) {
  return (
    <div className="page page-editor">
      <Editor
        value={code}
        onChange={onChange}
        focusTarget={focusTarget}
        theme={theme}
      />
    </div>
  );
}