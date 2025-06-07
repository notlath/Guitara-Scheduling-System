import { useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  syncAppointmentCreatedConfirmed,
  syncAppointmentCreatedFailed,
  syncAppointmentCreatedOptimistic,
  syncAppointmentDeletedConfirmed,
  syncAppointmentDeletedFailed,
  syncAppointmentDeletedOptimistic,
  syncAppointmentUpdatedConfirmed,
  syncAppointmentUpdatedFailed,
  syncAppointmentUpdatedOptimistic,
  syncAvailabilityCreated,
  syncAvailabilityDeleted,
  syncAvailabilityUpdated,
} from "../features/scheduling/schedulingSlice";
import syncService from "../services/syncService";

/**
 * Custom hook to handle sync events and dispatch corresponding Redux actions
 * This ensures that all sync events update the Redux state across all dashboards
 */
export const useSyncEventHandlers = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    console.log("🔗 Setting up sync event handlers for Redux state updates");

    // Handle availability creation sync events
    const unsubscribeCreated = syncService.subscribe(
      "availability_created",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAvailabilityCreated",
          data
        );
        if (data.availability) {
          dispatch(syncAvailabilityCreated(data.availability));
        }
      }
    );

    // Handle availability update sync events
    const unsubscribeUpdated = syncService.subscribe(
      "availability_updated",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAvailabilityUpdated",
          data
        );
        if (data.availability) {
          dispatch(syncAvailabilityUpdated(data.availability));
        }
      }
    );

    // Handle availability deletion sync events
    const unsubscribeDeleted = syncService.subscribe(
      "availability_deleted",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAvailabilityDeleted",
          data
        );
        dispatch(
          syncAvailabilityDeleted({
            id: data.id,
            user: data.user || data.staffId,
            date: data.date,
          })
        );
      }
    );

    // Handle appointment optimistic update events
    const unsubscribeAppointmentCreatedOptimistic = syncService.subscribe(
      "appointment_created_optimistic",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAppointmentCreatedOptimistic",
          data
        );
        dispatch(syncAppointmentCreatedOptimistic(data));
      }
    );

    const unsubscribeAppointmentCreatedConfirmed = syncService.subscribe(
      "appointment_created_confirmed",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAppointmentCreatedConfirmed",
          data
        );
        dispatch(syncAppointmentCreatedConfirmed(data));
      }
    );

    const unsubscribeAppointmentCreatedFailed = syncService.subscribe(
      "appointment_created_failed",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAppointmentCreatedFailed",
          data
        );
        dispatch(syncAppointmentCreatedFailed(data));
      }
    );

    const unsubscribeAppointmentUpdatedOptimistic = syncService.subscribe(
      "appointment_updated_optimistic",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAppointmentUpdatedOptimistic",
          data
        );
        dispatch(syncAppointmentUpdatedOptimistic(data));
      }
    );

    const unsubscribeAppointmentUpdatedConfirmed = syncService.subscribe(
      "appointment_updated_confirmed",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAppointmentUpdatedConfirmed",
          data
        );
        dispatch(syncAppointmentUpdatedConfirmed(data));
      }
    );

    const unsubscribeAppointmentUpdatedFailed = syncService.subscribe(
      "appointment_updated_failed",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAppointmentUpdatedFailed",
          data
        );
        dispatch(syncAppointmentUpdatedFailed(data));
      }
    );

    const unsubscribeAppointmentDeletedOptimistic = syncService.subscribe(
      "appointment_deleted_optimistic",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAppointmentDeletedOptimistic",
          data
        );
        dispatch(syncAppointmentDeletedOptimistic(data));
      }
    );

    const unsubscribeAppointmentDeletedConfirmed = syncService.subscribe(
      "appointment_deleted_confirmed",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAppointmentDeletedConfirmed",
          data
        );
        dispatch(syncAppointmentDeletedConfirmed(data));
      }
    );

    const unsubscribeAppointmentDeletedFailed = syncService.subscribe(
      "appointment_deleted_failed",
      (data) => {
        console.log(
          "🔄 Sync Handler: Dispatching syncAppointmentDeletedFailed",
          data
        );
        dispatch(syncAppointmentDeletedFailed(data));
      }
    );

    // Cleanup subscriptions when component unmounts
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeAppointmentCreatedOptimistic();
      unsubscribeAppointmentCreatedConfirmed();
      unsubscribeAppointmentCreatedFailed();
      unsubscribeAppointmentUpdatedOptimistic();
      unsubscribeAppointmentUpdatedConfirmed();
      unsubscribeAppointmentUpdatedFailed();
      unsubscribeAppointmentDeletedOptimistic();
      unsubscribeAppointmentDeletedConfirmed();
      unsubscribeAppointmentDeletedFailed();
    };
  }, [dispatch]);
};

export default useSyncEventHandlers;
