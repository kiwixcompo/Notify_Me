import { useState } from 'react';

const PREDEFINED = [
  'web design',
  'web developer',
  'php developer',
  'wordpress website jobs',
  'frontend',
  'backend',
  'full stack',
  'javascript',
  'react',
  'node.js',
  'python',
  'devops',
  'designer',
  'project manager'
];

export default function PreferenceDropdown({ value, onChange }) {
  const [custom, setCustom] = useState('');
  const add = v => {
    if (v && !value.includes(v)) onChange([...value, v]);
  };
  const remove = v => onChange(value.filter(j => j !== v));
  return (
    <div>
      <label className="block mb-2 font-medium">Select job titles/keywords:</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(v => (
          <span key={v} className="bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center">
            {v}
            <button type="button" className="ml-1 text-blue-600 hover:text-red-600" onClick={() => remove(v)}>&times;</button>
          </span>
        ))}
      </div>
      <select
        className="w-full px-3 py-2 border rounded mb-2"
        onChange={e => { add(e.target.value); e.target.selectedIndex = 0; }}
        value=""
      >
        <option value="">Add from list...</option>
        {PREDEFINED.filter(opt => !value.includes(opt)).map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-3 py-2 border rounded"
          placeholder="Add custom keyword"
          value={custom}
          onChange={e => setCustom(e.target.value)}
        />
        <button
          type="button"
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => { add(custom.trim()); setCustom(''); }}
          disabled={!custom.trim()}
        >Add</button>
      </div>
    </div>
  );
} 