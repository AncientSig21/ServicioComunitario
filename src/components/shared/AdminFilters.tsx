import { useState } from 'react';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

interface AdminFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterOptions) => void;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
}

interface FilterOptions {
  [key: string]: string | string[];
}

interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date';
  options?: { value: string; label: string }[];
}

export const AdminFilters = ({ 
  onSearch, 
  onFilterChange, 
  searchPlaceholder = "Buscar...",
  filterOptions = []
}: AdminFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({});

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (key: string, value: string | string[]) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setActiveFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Barra de búsqueda */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary text-gray-800 placeholder-gray-500 bg-white transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-secondary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FaFilter />
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className="bg-white text-secondary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {Object.keys(activeFilters).length}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Limpiar filtros"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterOptions.map((option) => (
              <div key={option.key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {option.label}
                </label>
                {option.type === 'select' && (
                  <select
                    value={activeFilters[option.key] as string || ''}
                    onChange={(e) => handleFilterChange(option.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">Todos</option>
                    {option.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {option.type === 'multiselect' && (
                  <select
                    multiple
                    value={activeFilters[option.key] as string[] || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange(option.key, selected);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary"
                  >
                    {option.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {option.type === 'date' && (
                  <input
                    type="date"
                    value={activeFilters[option.key] as string || ''}
                    onChange={(e) => handleFilterChange(option.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 