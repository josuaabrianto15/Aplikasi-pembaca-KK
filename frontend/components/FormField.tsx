import React from "react";

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
  hint?: string;
}

export default function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required,
  as = "input",
  options,
  hint,
}: FormFieldProps) {
  const baseClass = `w-full px-3 py-2 text-sm rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-green-400 ${
    error
      ? "border-red-400 bg-red-50"
      : "border-gray-300 bg-white hover:border-gray-400"
  }`;

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {as === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={2}
          className={`${baseClass} resize-none`}
        />
      ) : as === "select" ? (
        <select name={name} value={value} onChange={onChange} className={baseClass}>
          <option value="">— Pilih —</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
      {hint && !error && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
