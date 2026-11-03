import React, { useState, useMemo } from 'react';
import { Search, CheckSquare, Square, ChevronDown, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';

export const PermissionMatrix = ({
  permissions = [],
  selectedIds = [],
  onChange,
  disabled = false,
  readOnly = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Group permissions by category
  const categories = useMemo(() => {
    const map = {};
    for (const p of permissions) {
      if (!map[p.category]) {
        map[p.category] = [];
      }
      map[p.category].push(p);
    }
    return map;
  }, [permissions]);

  // Filtered categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase();
    const result = {};

    for (const [cat, perms] of Object.entries(categories)) {
      const matching = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.key.toLowerCase().includes(term) ||
          (p.description && p.description.toLowerCase().includes(term))
      );
      if (matching.length > 0) {
        result[cat] = matching;
      }
    }
    return result;
  }, [categories, searchTerm]);

  const toggleCategoryCollapse = (category) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleTogglePermission = (permissionId) => {
    if (disabled || readOnly) return;
    const current = new Set(selectedIds);
    if (current.has(permissionId)) {
      current.delete(permissionId);
    } else {
      current.add(permissionId);
    }
    onChange(Array.from(current));
  };

  const handleSelectAllCategory = (catPerms) => {
    if (disabled || readOnly) return;
    const current = new Set(selectedIds);
    const allSelected = catPerms.every((p) => current.has(p.id));

    if (allSelected) {
      catPerms.forEach((p) => current.delete(p.id));
    } else {
      catPerms.forEach((p) => current.add(p.id));
    }
    onChange(Array.from(current));
  };

  const selectedCount = selectedIds.length;

  return (
    <div className="space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search permissions by name or action..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-blue-100/80 text-blue-900 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Selected: {selectedCount} / {permissions.length}</span>
          </div>
        </div>
      </div>

      {/* Category Accordions */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {Object.keys(filteredCategories).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">
            No permissions matching "{searchTerm}"
          </div>
        ) : (
          Object.entries(filteredCategories).map(([category, catPerms]) => {
            const isCollapsed = collapsedCategories[category];
            const catSelectedCount = catPerms.filter((p) => selectedIds.includes(p.id)).length;
            const isAllSelected = catPerms.length > 0 && catSelectedCount === catPerms.length;

            return (
              <div
                key={category}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/60 select-none">
                  <div
                    onClick={() => toggleCategoryCollapse(category)}
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {category}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      ({catSelectedCount}/{catPerms.length})
                    </span>
                  </div>

                  {!disabled && !readOnly && (
                    <button
                      type="button"
                      onClick={() => handleSelectAllCategory(catPerms)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors px-2 py-0.5 rounded-lg hover:bg-blue-50"
                    >
                      {isAllSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Permissions List */}
                {!isCollapsed && (
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white">
                    {catPerms.map((perm) => {
                      const isSelected = selectedIds.includes(perm.id);

                      return (
                        <div
                          key={perm.id}
                          onClick={() => handleTogglePermission(perm.id)}
                          className={`p-2.5 rounded-xl border transition-all select-none flex items-start gap-2.5 ${
                            disabled || readOnly ? 'cursor-default' : 'cursor-pointer'
                          } ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-200 text-slate-900 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold leading-tight truncate">
                                {perm.name}
                              </span>
                            </div>
                            <code className="text-[10px] text-blue-700 font-mono block mt-0.5">
                              {perm.key}
                            </code>
                            {perm.description && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                                {perm.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
