export const getCurrentStatus = (store) => {
  if (!store) return '';

  if (store.status === 'CLOSED' || store.status === 'Closed') {
    return 'Closed';
  }

  if (store.status === 'LIVE' || store.status === 'Live') {
    const liveDates = [];
    if (store.inStoreLive && store.inStoreLiveDate) {
      liveDates.push(new Date(store.inStoreLiveDate));
    }
    if (store.deliveryLive && store.deliveryLiveDate) {
      liveDates.push(new Date(store.deliveryLiveDate));
    }

    const targetDate = liveDates.length > 0
      ? new Date(Math.min(...liveDates.map(d => d.getTime())))
      : (store.launchDate ? new Date(store.launchDate) : null);

    if (targetDate) {
      const diffTime = new Date() - targetDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays < 30) {
        return 'Newly Launched';
      } else {
        return 'Active';
      }
    }
    return 'Newly Launched';
  }

  if (store.status === 'READY_TO_GO_LIVE') {
    return 'Ready to Go Live';
  }

  if (store.status !== 'LIVE' && store.status !== 'Live' && store.status !== 'CLOSED' && store.status !== 'Closed') {
    return 'Upcoming Store';
  }

  return store.status ? store.status.replace(/_/g, ' ') : '';
};

export const getCurrentStatusDotColor = (currentStatus) => {
  switch (currentStatus) {
    case 'Upcoming Store':
      return '#eab308'; // Yellow
    case 'Ready to Go Live':
      return '#3b82f6'; // Blue
    case 'Newly Launched':
      return '#d946ef'; // Purple/Magenta
    case 'Active':
      return '#22c55e'; // Green
    case 'Closed':
      return '#ef4444'; // Red
    default:
      return '#9ca3af'; // Slate/Grey
  }
};

export const getCurrentStatusChipStyle = (currentStatus) => {
  switch (currentStatus) {
    case 'Upcoming Store':
      return { bgcolor: 'rgba(234, 179, 8, 0.12)', color: '#a16207', borderColor: 'rgba(234, 179, 8, 0.35)' };
    case 'Ready to Go Live':
      return { bgcolor: 'rgba(59, 130, 246, 0.12)', color: '#1d4ed8', borderColor: 'rgba(59, 130, 246, 0.3)' };
    case 'Newly Launched':
      return { bgcolor: 'rgba(217, 70, 239, 0.12)', color: '#a21caf', borderColor: 'rgba(217, 70, 239, 0.3)' };
    case 'Active':
      return { bgcolor: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', borderColor: 'rgba(34, 197, 94, 0.3)' };
    case 'Closed':
      return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.3)' };
    default:
      return { bgcolor: 'rgba(156, 163, 175, 0.12)', color: '#4b5563', borderColor: 'rgba(156, 163, 175, 0.3)' };
  }
};

export const getCurrentStatusTextFormat = (store) => {
  const status = getCurrentStatus(store);
  if (!status) return '';
  let dot = '🟡';
  if (status === 'Active') dot = '🟢';
  if (status === 'Closed') dot = '🔴';
  if (status === 'Newly Launched') dot = '🟣';
  if (status === 'Ready to Go Live') dot = '🔵';
  return `${dot} ${status}`;
};

export const getStatusRgb = (status) => {
  switch (status) {
    case 'Upcoming Store': return '234, 179, 8';
    case 'Ready to Go Live': return '59, 130, 246';
    case 'Newly Launched': return '217, 70, 239';
    case 'Active': return '34, 197, 94';
    case 'Closed': return '239, 68, 68';
    default: return '156, 163, 175';
  }
};

export const sortStoresByCurrentStatus = (stores) => {
  if (!Array.isArray(stores)) return [];
  
  const statusPriority = {
    'Ready to Go Live': 1,
    'Upcoming Store': 2,
    'Newly Launched': 3,
    'Active': 4,
    'Closed': 5
  };

  return [...stores].sort((a, b) => {
    const statusA = getCurrentStatus(a);
    const statusB = getCurrentStatus(b);
    
    const priorityA = statusPriority[statusA] || 99;
    const priorityB = statusPriority[statusB] || 99;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Secondary sort alphabetically by cafeName (case-insensitive) to keep it clean and deterministic
    const nameA = (a.cafeName || '').toLowerCase();
    const nameB = (b.cafeName || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
};
