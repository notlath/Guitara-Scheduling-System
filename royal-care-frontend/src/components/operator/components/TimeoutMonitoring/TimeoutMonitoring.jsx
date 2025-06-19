/**
 * Timeout Monitoring Component
 * Monitors and manages overdue appointments and approaching deadlines
 */
import { useCallback, useMemo } from "react";
import { LoadingButton } from "../../../common/LoadingComponents";
import { useOperatorData } from "../../hooks/useOperatorData";
import AppointmentCard from "../AppointmentManager/AppointmentCard";
import "./TimeoutMonitoring.module.css";

const TimeoutMonitoring = ({ className = "" }) => {
  const { 
    overdueAppointments, 
    approachingDeadlineAppointments,
    countdowns,
    loading,
    handleAutoCancelOverdue,
    autoCancelLoading 
  } = useOperatorData();

  // Group appointments by urgency
  const urgencyGroups = useMemo(() => {
    const groups = {
      critical: [], // > 2 hours overdue
      urgent: [],   // 30min - 2 hours overdue
      warning: [],  // approaching deadline (< 30min left)
    };

    overdueAppointments?.forEach(appointment => {
      const overdueMinutes = getOverdueMinutes(appointment);
      if (overdueMinutes > 120) {
        groups.critical.push(appointment);
      } else {
        groups.urgent.push(appointment);
      }
    });

    approachingDeadlineAppointments?.forEach(appointment => {
      groups.warning.push(appointment);
    });

    return groups;
  }, [overdueAppointments, approachingDeadlineAppointments]);

  // Calculate overdue minutes
  const getOverdueMinutes = (appointment) => {
    const appointmentTime = new Date(`${appointment.date} ${appointment.start_time}`);
    const now = new Date();
    return Math.floor((now - appointmentTime) / (1000 * 60));
  };

  // Handle auto-cancel action
  const handleAutoCancelAction = useCallback(async () => {
    try {
      await handleAutoCancelOverdue();
      // Show success notification
    } catch (error) {
      console.error("Auto-cancel failed:", error);
      // Show error notification
    }
  }, [handleAutoCancelOverdue]);

  // Handle individual appointment timeout action
  const handleTimeoutAction = useCallback(async (appointment, action) => {
    switch (action) {
      case 'cancel':
        // Handle cancel action
        break;
      case 'extend':
        // Handle extend deadline action
        break;
      case 'escalate':
        // Handle escalate action
        break;
      default:
        console.log(`Unknown timeout action: ${action}`);
    }
  }, []);

  // Stats summary
  const stats = useMemo(() => ({
    totalOverdue: overdueAppointments?.length || 0,
    criticalCount: urgencyGroups.critical.length,
    urgentCount: urgencyGroups.urgent.length,
    warningCount: urgencyGroups.warning.length,
    totalApproaching: approachingDeadlineAppointments?.length || 0,
  }), [overdueAppointments, approachingDeadlineAppointments, urgencyGroups]);

  return (
    <div className={`timeout-monitoring ${className}`}>
      {/* Header with stats */}
      <div className="timeout-header">
        <div className="timeout-stats">
          <div className="stat-card critical">
            <div className="stat-number">{stats.criticalCount}</div>
            <div className="stat-label">Critical</div>
          </div>
          <div className="stat-card urgent">
            <div className="stat-number">{stats.urgentCount}</div>
            <div className="stat-label">Urgent</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-number">{stats.warningCount}</div>
            <div className="stat-label">Warning</div>
          </div>
          <div className="stat-card approaching">
            <div className="stat-number">{stats.totalApproaching}</div>
            <div className="stat-label">Approaching</div>
          </div>
        </div>

        <div className="timeout-actions">
          <LoadingButton
            onClick={handleAutoCancelAction}
            loading={autoCancelLoading}
            className="auto-cancel-button danger"
            disabled={stats.totalOverdue === 0}
          >
            <i className="fas fa-times-circle"></i>
            Auto-Cancel Overdue ({stats.totalOverdue})
          </LoadingButton>
        </div>
      </div>

      {/* Critical Appointments (> 2 hours overdue) */}
      {urgencyGroups.critical.length > 0 && (
        <div className="timeout-section critical-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-exclamation-triangle"></i>
              Critical - Overdue More Than 2 Hours
            </h3>
            <span className="section-count">{urgencyGroups.critical.length}</span>
          </div>
          <div className="appointments-grid">
            {urgencyGroups.critical.map(appointment => (
              <div key={appointment.id} className="timeout-appointment-wrapper">
                <AppointmentCard 
                  appointment={appointment}
                  variant="critical"
                  showCountdown={true}
                  countdown={countdowns?.[appointment.id]}
                  onAction={(action) => handleTimeoutAction(appointment, action)}
                  actions={[
                    { id: 'cancel', label: 'Cancel', icon: 'fas fa-times', variant: 'danger' },
                    { id: 'escalate', label: 'Escalate', icon: 'fas fa-arrow-up', variant: 'warning' }
                  ]}
                />
                <div className="overdue-indicator critical">
                  <i className="fas fa-clock"></i>
                  {getOverdueMinutes(appointment)} minutes overdue
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgent Appointments (30min - 2 hours overdue) */}
      {urgencyGroups.urgent.length > 0 && (
        <div className="timeout-section urgent-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-clock"></i>
              Urgent - Recently Overdue
            </h3>
            <span className="section-count">{urgencyGroups.urgent.length}</span>
          </div>
          <div className="appointments-grid">
            {urgencyGroups.urgent.map(appointment => (
              <div key={appointment.id} className="timeout-appointment-wrapper">
                <AppointmentCard 
                  appointment={appointment}
                  variant="urgent"
                  showCountdown={true}
                  countdown={countdowns?.[appointment.id]}
                  onAction={(action) => handleTimeoutAction(appointment, action)}
                  actions={[
                    { id: 'extend', label: 'Extend', icon: 'fas fa-clock', variant: 'primary' },
                    { id: 'cancel', label: 'Cancel', icon: 'fas fa-times', variant: 'danger' }
                  ]}
                />
                <div className="overdue-indicator urgent">
                  <i className="fas fa-clock"></i>
                  {getOverdueMinutes(appointment)} minutes overdue
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approaching Deadline Appointments */}
      {urgencyGroups.warning.length > 0 && (
        <div className="timeout-section warning-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-hourglass-half"></i>
              Approaching Deadlines
            </h3>
            <span className="section-count">{urgencyGroups.warning.length}</span>
          </div>
          <div className="appointments-grid">
            {urgencyGroups.warning.map(appointment => (
              <div key={appointment.id} className="timeout-appointment-wrapper">
                <AppointmentCard 
                  appointment={appointment}
                  variant="warning"
                  showCountdown={true}
                  countdown={countdowns?.[appointment.id]}
                  onAction={(action) => handleTimeoutAction(appointment, action)}
                  actions={[
                    { id: 'remind', label: 'Remind', icon: 'fas fa-bell', variant: 'info' },
                    { id: 'extend', label: 'Extend', icon: 'fas fa-clock', variant: 'primary' }
                  ]}
                />
                <div className="deadline-countdown warning">
                  <i className="fas fa-hourglass-half"></i>
                  {countdowns?.[appointment.id]?.display || 'Calculating...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalOverdue === 0 && stats.totalApproaching === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h3>All Clear!</h3>
          <p>No appointments are overdue or approaching deadlines.</p>
          <p>Great job managing the schedule!</p>
        </div>
      )}

      {/* Loading overlay */}
      {loading.timeouts && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            Loading timeout information...
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeoutMonitoring;
