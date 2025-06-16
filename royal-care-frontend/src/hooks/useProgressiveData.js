/**
 * Progressive Data Loading with Field Prioritization
 * Implements Solution #5: Progressive loading with essential/standard/complete phases
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDataManager } from "./useDataManager";

/**
 * Hook for progressive data loading with field prioritization
 * @param {string} dataType - Type of data to load progressively
 * @param {Object} fieldPriorities - Field priority configuration
 * @param {Object} options - Additional options
 * @returns {Object} Progressive loading state and data
 */
export const useProgressiveData = (
  dataType,
  fieldPriorities = {},
  options = {}
) => {
  const {
    componentName = "progressiveLoader",
    essentialFields = [],
    standardFields = [],
    completeFields = [],
    phaseDelays = { standard: 500, complete: 1000 },
    enableAutoProgression = true,
    maxRetries = 3,
  } = options;

  const [progressiveState, setProgressiveState] = useState({
    essential: null,
    standard: null,
    complete: null,
    currentPhase: "loading",
    loadingPhases: new Set(),
    failedPhases: new Set(),
    retryCount: 0,
  });

  // Get base data from data manager
  const { loading, error, forceRefresh, hasAnyData, isRefreshing } =
    useDataManager(componentName, [dataType]);

  // Determine field priorities based on configuration
  const fieldConfig = useMemo(() => {
    return {
      essential:
        essentialFields.length > 0
          ? essentialFields
          : ["id", "status", "timestamp", ...(fieldPriorities.essential || [])],
      standard:
        standardFields.length > 0
          ? standardFields
          : [
              "title",
              "description",
              "date",
              "time",
              ...(fieldPriorities.standard || []),
            ],
      complete:
        completeFields.length > 0
          ? completeFields
          : fieldPriorities.complete || [],
    };
  }, [essentialFields, standardFields, completeFields, fieldPriorities]);

  /**
   * Extract fields from data based on priority level
   */
  const extractFieldsByPriority = useCallback(
    (data, phase) => {
      if (!data || !Array.isArray(data)) return data;

      const fieldsToInclude = new Set();

      // Always include essential fields
      fieldConfig.essential.forEach((field) => fieldsToInclude.add(field));

      // Add standard fields if in standard or complete phase
      if (phase === "standard" || phase === "complete") {
        fieldConfig.standard.forEach((field) => fieldsToInclude.add(field));
      }

      // Add all fields if in complete phase
      if (phase === "complete") {
        fieldConfig.complete.forEach((field) => fieldsToInclude.add(field));
        // In complete phase, return full data
        return data;
      }

      // Filter data to include only required fields
      return data.map((item) => {
        const filteredItem = {};
        for (const field of fieldsToInclude) {
          if (field in item) {
            filteredItem[field] = item[field];
          }
        }
        // Always preserve ID for React keys
        if (item.id && !filteredItem.id) {
          filteredItem.id = item.id;
        }

        return filteredItem;
      });
    },
    [fieldConfig]
  );

  /**
   * Load data for specific phase
   */
  const loadPhaseData = useCallback(
    async (phase, rawData) => {
      if (!rawData) return null;

      console.log(`📊 ProgressiveData: Loading ${phase} phase for ${dataType}`);

      setProgressiveState((prev) => ({
        ...prev,
        loadingPhases: new Set([...prev.loadingPhases, phase]),
      }));

      try {
        // Simulate progressive loading with field filtering
        const phaseData = extractFieldsByPriority(rawData, phase);

        // Add artificial delay for demonstration (remove in production if not needed)
        if (phaseDelays[phase]) {
          await new Promise((resolve) =>
            setTimeout(resolve, phaseDelays[phase])
          );
        }

        setProgressiveState((prev) => ({
          ...prev,
          [phase]: phaseData,
          currentPhase: phase,
          loadingPhases: new Set(
            [...prev.loadingPhases].filter((p) => p !== phase)
          ),
          failedPhases: new Set(
            [...prev.failedPhases].filter((p) => p !== phase)
          ),
        }));

        console.log(
          `✅ ProgressiveData: ${phase} phase loaded for ${dataType}`
        );
        return phaseData;
      } catch (error) {
        console.error(
          `❌ ProgressiveData: Failed to load ${phase} phase for ${dataType}:`,
          error
        );

        setProgressiveState((prev) => ({
          ...prev,
          loadingPhases: new Set(
            [...prev.loadingPhases].filter((p) => p !== phase)
          ),
          failedPhases: new Set([...prev.failedPhases, phase]),
          retryCount: prev.retryCount + 1,
        }));

        throw error;
      }
    },
    [dataType, extractFieldsByPriority, phaseDelays]
  );

  /**
   * Start progressive loading sequence
   */
  const startProgressiveLoading = useCallback(
    async (rawData) => {
      if (!rawData) return;

      try {
        // Phase 1: Essential fields only (immediate display)
        const essentialData = await loadPhaseData("essential", rawData);

        if (enableAutoProgression && essentialData) {
          // Phase 2: Standard fields (enhanced display)
          setTimeout(async () => {
            try {
              const standardData = await loadPhaseData("standard", rawData);

              // Phase 3: Complete data (full functionality)
              if (standardData) {
                setTimeout(async () => {
                  try {
                    await loadPhaseData("complete", rawData);
                  } catch (err) {
                    console.warn(
                      "Progressive loading: Complete phase failed, using standard data",
                      err.message
                    );
                  }
                }, phaseDelays.complete || 1000);
              }
            } catch (err) {
              console.warn(
                "Progressive loading: Standard phase failed, retrying...",
                err.message
              );
              // Retry logic could be added here
            }
          }, phaseDelays.standard || 500);
        }
      } catch (error) {
        console.error("Progressive loading: Essential phase failed:", error);

        // Retry essential phase if it fails
        if (progressiveState.retryCount < maxRetries) {
          setTimeout(() => {
            startProgressiveLoading(rawData);
          }, 1000 * (progressiveState.retryCount + 1)); // Exponential backoff
        }
      }
    },
    [
      loadPhaseData,
      enableAutoProgression,
      phaseDelays,
      progressiveState.retryCount,
      maxRetries,
    ]
  );

  /**
   * Get the best available data for current state
   */
  const getBestAvailableData = useCallback(() => {
    if (progressiveState.complete) return progressiveState.complete;
    if (progressiveState.standard) return progressiveState.standard;
    if (progressiveState.essential) return progressiveState.essential;
    return null;
  }, [progressiveState]);

  /**
   * Check loading state for each phase
   */
  const getLoadingStates = useCallback(() => {
    return {
      isLoadingEssential: progressiveState.loadingPhases.has("essential"),
      isLoadingStandard: progressiveState.loadingPhases.has("standard"),
      isLoadingComplete: progressiveState.loadingPhases.has("complete"),
      hasAnyLoading: progressiveState.loadingPhases.size > 0,
      failedPhases: Array.from(progressiveState.failedPhases),
      currentPhase: progressiveState.currentPhase,
    };
  }, [progressiveState]);

  /**
   * Get data completeness information
   */
  const getDataCompleteness = useCallback(() => {
    const availableData = getBestAvailableData();
    if (
      !availableData ||
      !Array.isArray(availableData) ||
      availableData.length === 0
    ) {
      return { level: "none", percentage: 0, missingFields: [] };
    }

    const sampleItem = availableData[0];
    const allPossibleFields = new Set([
      ...fieldConfig.essential,
      ...fieldConfig.standard,
      ...fieldConfig.complete,
    ]);

    const presentFields = Object.keys(sampleItem);
    const missingFields = Array.from(allPossibleFields).filter(
      (field) => !presentFields.includes(field)
    );

    let level = "essential";
    let percentage = 33;

    if (progressiveState.complete) {
      level = "complete";
      percentage = 100;
    } else if (progressiveState.standard) {
      level = "standard";
      percentage = 66;
    }

    return {
      level,
      percentage,
      missingFields,
      presentFields,
      totalPossibleFields: allPossibleFields.size,
    };
  }, [getBestAvailableData, fieldConfig, progressiveState]);

  /**
   * Force refresh of specific phase
   */
  const refreshPhase = useCallback(
    async (phase = "complete") => {
      console.log(`🔄 ProgressiveData: Force refreshing ${phase} phase`);

      try {
        const refreshedData = await forceRefresh();
        if (refreshedData) {
          await loadPhaseData(phase, refreshedData);
        }
      } catch (error) {
        console.error(`Failed to refresh ${phase} phase:`, error);
      }
    },
    [forceRefresh, loadPhaseData]
  );

  /**
   * Reset progressive state
   */
  const resetProgressiveState = useCallback(() => {
    setProgressiveState({
      essential: null,
      standard: null,
      complete: null,
      currentPhase: "loading",
      loadingPhases: new Set(),
      failedPhases: new Set(),
      retryCount: 0,
    });
  }, []);

  // Auto-start progressive loading when base data becomes available
  useEffect(() => {
    if (hasAnyData && !progressiveState.essential && !loading) {
      // Trigger progressive loading with available data
      // In a real implementation, you'd get the raw data from the data manager
      // For now, we'll simulate it
      const simulateRawData = async () => {
        try {
          const result = await forceRefresh([dataType]);
          if (result) {
            startProgressiveLoading(result);
          }
        } catch (error) {
          console.warn(
            "Failed to get raw data for progressive loading:",
            error
          );
        }
      };

      simulateRawData();
    }
  }, [
    hasAnyData,
    loading,
    progressiveState.essential,
    forceRefresh,
    dataType,
    startProgressiveLoading,
  ]);

  return {
    // Progressive data states
    essential: progressiveState.essential,
    standard: progressiveState.standard,
    complete: progressiveState.complete,

    // Best available data
    data: getBestAvailableData(),

    // Loading states
    ...getLoadingStates(),
    isProgressive: progressiveState.essential && !progressiveState.complete,

    // Data quality
    completeness: getDataCompleteness(),

    // State indicators
    hasData: !!getBestAvailableData(),
    isEmpty: !getBestAvailableData() || getBestAvailableData().length === 0,

    // Error handling
    error,
    hasFailures: progressiveState.failedPhases.size > 0,
    retryCount: progressiveState.retryCount,

    // Actions
    refreshPhase,
    resetProgressiveState,
    forceRefresh,

    // Background state
    isRefreshing: isRefreshing || progressiveState.loadingPhases.size > 0,

    // Debug info
    fieldConfig,
    phases: {
      essential: !!progressiveState.essential,
      standard: !!progressiveState.standard,
      complete: !!progressiveState.complete,
    },
  };
};

/**
 * Hook for field-specific progressive loading
 * Loads specific fields incrementally based on priority
 */
export const useFieldProgressiveLoading = (
  dataType,
  fieldGroups = {},
  options = {}
) => {
  const [fieldData, setFieldData] = useState(new Map());
  const [loadingFields, setLoadingFields] = useState(new Set());

  const {
    autoLoadOrder = ["critical", "important", "optional"],
    fieldLoadDelay = 200,
  } = options;

  /**
   * Load specific field group
   */
  const loadFieldGroup = useCallback(
    async (groupName, fields) => {
      console.log(`📊 FieldProgressive: Loading ${groupName} fields:`, fields);

      setLoadingFields((prev) => new Set([...prev, ...fields]));

      try {
        // Simulate field-specific loading
        const fieldResults = new Map();

        for (const field of fields) {
          // Simulate API call for specific field
          await new Promise((resolve) => setTimeout(resolve, fieldLoadDelay));

          // In real implementation, this would fetch specific field data
          fieldResults.set(field, {
            loaded: true,
            timestamp: Date.now(),
            groupName,
          });

          console.log(`✅ FieldProgressive: Loaded field ${field}`);
        }

        setFieldData((prev) => {
          const newMap = new Map(prev);
          fieldResults.forEach((value, key) => {
            newMap.set(key, value);
          });
          return newMap;
        });
      } catch (error) {
        console.error(
          `❌ FieldProgressive: Failed to load ${groupName} fields:`,
          error
        );
      } finally {
        setLoadingFields((prev) => {
          const newSet = new Set(prev);
          fields.forEach((field) => newSet.delete(field));
          return newSet;
        });
      }
    },
    [fieldLoadDelay]
  );

  /**
   * Start auto-loading sequence
   */
  const startAutoLoading = useCallback(() => {
    autoLoadOrder.forEach((groupName, index) => {
      const fields = fieldGroups[groupName] || [];
      if (fields.length > 0) {
        setTimeout(() => {
          loadFieldGroup(groupName, fields);
        }, index * 1000); // Stagger group loading
      }
    });
  }, [autoLoadOrder, fieldGroups, loadFieldGroup]);

  return {
    fieldData: Object.fromEntries(fieldData),
    loadingFields: Array.from(loadingFields),
    loadFieldGroup,
    startAutoLoading,
    isLoadingAnyField: loadingFields.size > 0,
    completedFields: Array.from(fieldData.keys()),
  };
};

export default useProgressiveData;
