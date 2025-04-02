import { useState, useMemo } from 'react';

interface Process {
  id: number;
  index: number;
  arrival: string;
  burst: string;
  priority: string;
}

type SortField = 'arrival' | 'burst' | 'priority';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

export const useProcessSorting = (processes: Process[]) => {
  const [sortState, setSortState] = useState<SortState>({
    field: null,
    direction: 'asc'
  });

  const toggleSort = (field: SortField) => {
    setSortState(prev => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return {
        field,
        direction: 'asc'
      };
    });
  };

  const resetSort = () => {
    setSortState({
      field: null,
      direction: 'asc'
    });
  };

  const sortedProcesses = useMemo(() => {
    if (!sortState.field) return processes;

    return [...processes].sort((a, b) => {
      const aValue = parseInt(a[sortState.field!]);
      const bValue = parseInt(b[sortState.field!]);
      
      if (sortState.direction === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
  }, [processes, sortState]);

  return {
    sortedProcesses,
    sortState,
    toggleSort,
    resetSort
  };
}; 