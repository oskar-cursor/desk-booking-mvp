"use client";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getKey: (item: T) => string;
  headerRow?: React.ReactNode;
}

export default function AdminTable<T>({
  columns,
  data,
  getKey,
  headerRow,
}: AdminTableProps<T>) {
  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-4 py-3 font-semibold text-gray-600 ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {headerRow}
          {data.map((item) => (
            <tr key={getKey(item)} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 ${col.className || ""}`}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && !headerRow && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                Brak danych
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
