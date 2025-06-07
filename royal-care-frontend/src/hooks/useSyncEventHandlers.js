import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import syncService from '../services/syncService';
import { 
  syncAvailabilityCreated, 
  syncAvailabilityUpdated, 
  syncAvailabilityDeleted 
} from '../features/scheduling/schedulingSlice';

/**
 * Custom hook to handle sync events and dispatch corresponding Redux actions
 * This ensures that all sync events update the Redux state across all dashboards
 */
export const useSyncEventHandlers = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    console.log("🔗 Setting up sync event handlers for Redux state updates");

    // Handle availability creation sync events
    const unsubscribeCreated = syncService.subscribe('availability_created', (data) => {
      console.log("🔄 Sync Handler: Dispatching syncAvailabilityCreated", data);
      if (data.availability) {
        dispatch(syncAvailabilityCreated(data.availability));
      }
    });

    // Handle availability update sync events
    const unsubscribeUpdated = syncService.subscribe('availability_updated', (data) => {
      console.log("🔄 Sync Handler: Dispatching syncAvailabilityUpdated", data);
      if (data.availability) {
        dispatch(syncAvailabilityUpdated(data.availability));
      }
    });

    // Handle availability deletion sync events
    const unsubscribeDeleted = syncService.subscribe('availability_deleted', (data) => {
      console.log("🔄 Sync Handler: Dispatching syncAvailabilityDeleted", data);
      dispatch(syncAvailabilityDeleted({
        id: data.id,
        user: data.user || data.staffId,
        date: data.date
      }));
    });

    // Cleanup subscriptions when component unmounts
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [dispatch]);
};

export default useSyncEventHandlers;
