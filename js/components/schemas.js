// Schemas and simple validators for request payloads
// Usage: const result = SCHEMAS.validateReportRequest(obj); if (!result.valid) console.warn(result.errors);

window.SCHEMAS = (function(){
    function makeResult() { return { valid: true, errors: [] }; }

    function isString(v){ return typeof v === 'string' && v.trim().length>0; }
    function isOptionalString(v){ return v == null || typeof v === 'string'; }
    function isNumber(v){ return typeof v === 'number' && !Number.isNaN(v); }
    function isOptionalNumber(v){ return v == null || isNumber(v); }
    function isBoolean(v){ return typeof v === 'boolean'; }
    function isDateString(v){ return isString(v) && !Number.isNaN(Date.parse(v)); }
    function isEnumValue(v, allowed){ return isString(v) && allowed.includes(v); }

    const DOCUMENT_TYPES = ['INDICATOR', 'FLOW', 'CHARACTERIZATION', 'REPORT'];
    const DOCUMENT_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
    const USER_ROLES = ['ADMIN', 'FACULTY_USER', 'VIEWER'];
    const NOTIFICATION_STATUSES = ['UNREAD', 'READ', 'ARCHIVED'];
    const INDICATOR_TRENDS = ['UPWARD', 'DOWNWARD', 'STABLE', 'NONE'];
    const COMPLIANCE_STATUSES = ['COMPLIANT', 'NON_COMPLIANT', 'AT_RISK'];

    function addError(res, message) {
        res.valid = false;
        res.errors.push(message);
    }

    function validateFacultyShape(payload, path = 'faculty') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!isString(payload.id)) addError(res, `${path}.id is required string`);
        if (!isString(payload.code)) addError(res, `${path}.code is required string`);
        if (!isString(payload.name)) addError(res, `${path}.name is required string`);
        if (!isString(payload.shortName)) addError(res, `${path}.shortName is required string`);
        if (payload.logo != null && !isOptionalString(payload.logo)) addError(res, `${path}.logo must be string or null`);
        if (payload.isActive != null && !isBoolean(payload.isActive)) addError(res, `${path}.isActive must be boolean`);
        if (payload.createdAt != null && !isDateString(payload.createdAt)) addError(res, `${path}.createdAt must be a date-time string`);
        return res;
    }

    function validateUserShape(payload, path = 'user') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!isString(payload.id)) addError(res, `${path}.id is required string`);
        if (!isString(payload.email)) addError(res, `${path}.email is required string`);
        if (payload.firstName != null && !isString(payload.firstName)) addError(res, `${path}.firstName must be string`);
        if (payload.lastName != null && !isString(payload.lastName)) addError(res, `${path}.lastName must be string`);
        if (payload.role != null && !isEnumValue(payload.role, USER_ROLES)) addError(res, `${path}.role must be one of: ${USER_ROLES.join(', ')}`);
        if (payload.faculty != null) {
            const facultyResult = validateFacultyShape(payload.faculty, `${path}.faculty`);
            if (!facultyResult.valid) res.errors.push(...facultyResult.errors);
        }
        if (payload.isActive != null && !isBoolean(payload.isActive)) addError(res, `${path}.isActive must be boolean`);
        if (payload.createdAt != null && !isDateString(payload.createdAt)) addError(res, `${path}.createdAt must be a date-time string`);
        if (payload.lastLogin != null && !isDateString(payload.lastLogin)) addError(res, `${path}.lastLogin must be a date-time string`);
        if (payload.fullName != null && !isString(payload.fullName)) addError(res, `${path}.fullName must be string`);
        return res;
    }

    function validateDocumentShape(payload, path = 'document') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!isString(payload.id)) addError(res, `${path}.id is required string`);
        if (!isString(payload.code)) addError(res, `${path}.code is required string`);
        if (!isEnumValue(payload.type, DOCUMENT_TYPES)) addError(res, `${path}.type must be one of: ${DOCUMENT_TYPES.join(', ')}`);
        if (!isString(payload.title)) addError(res, `${path}.title is required string`);
        if (payload.faculty != null) {
            const facultyResult = validateFacultyShape(payload.faculty, `${path}.faculty`);
            if (!facultyResult.valid) res.errors.push(...facultyResult.errors);
        }
        if (payload.status != null && !isEnumValue(payload.status, DOCUMENT_STATUSES)) addError(res, `${path}.status must be one of: ${DOCUMENT_STATUSES.join(', ')}`);
        if (payload.progress != null && !Number.isInteger(payload.progress)) addError(res, `${path}.progress must be integer`);
        if (payload.createdBy != null) {
            const userResult = validateUserShape(payload.createdBy, `${path}.createdBy`);
            if (!userResult.valid) res.errors.push(...userResult.errors);
        }
        if (payload.createdAt != null && !isDateString(payload.createdAt)) addError(res, `${path}.createdAt must be a date-time string`);
        if (payload.updatedAt != null && !isDateString(payload.updatedAt)) addError(res, `${path}.updatedAt must be a date-time string`);
        if (payload.approvedAt != null && !isDateString(payload.approvedAt)) addError(res, `${path}.approvedAt must be a date-time string`);
        if (payload.approvedBy != null) {
            const approvedByResult = validateUserShape(payload.approvedBy, `${path}.approvedBy`);
            if (!approvedByResult.valid) res.errors.push(...approvedByResult.errors);
        }
        if (payload.currentVersion != null && !Number.isInteger(payload.currentVersion)) addError(res, `${path}.currentVersion must be integer`);
        if (payload.isPublic != null && !isBoolean(payload.isPublic)) addError(res, `${path}.isPublic must be boolean`);
        if (Array.isArray(payload.history)) {
            payload.history.forEach((item, index) => {
                const historyResult = validateHistoryEntryShape(item, `${path}.history[${index}]`, false);
                if (!historyResult.valid) res.errors.push(...historyResult.errors);
            });
        }
        return res;
    }

    function validateAttachmentShape(payload, path = 'attachment', deep = false) {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!isString(payload.id)) addError(res, `${path}.id is required string`);
        if (payload.historyEntry != null && deep) {
            const historyResult = validateHistoryEntryShape(payload.historyEntry, `${path}.historyEntry`, false);
            if (!historyResult.valid) res.errors.push(...historyResult.errors);
        }
        if (payload.filename != null && !isString(payload.filename)) addError(res, `${path}.filename must be string`);
        if (payload.url != null && !isString(payload.url)) addError(res, `${path}.url must be string`);
        if (payload.type != null && !isString(payload.type)) addError(res, `${path}.type must be string`);
        if (payload.uploadedAt != null && !isDateString(payload.uploadedAt)) addError(res, `${path}.uploadedAt must be a date-time string`);
        return res;
    }

    function validateHistoryEntryShape(payload, path = 'historyEntry', deep = true) {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!isString(payload.id)) addError(res, `${path}.id is required string`);
        if (payload.document != null) {
            const documentResult = validateDocumentShape(payload.document, `${path}.document`);
            if (!documentResult.valid) res.errors.push(...documentResult.errors);
        }
        if (payload.date != null && !isDateString(payload.date)) addError(res, `${path}.date must be a date-time string`);
        if (payload.progress != null && !Number.isInteger(payload.progress)) addError(res, `${path}.progress must be integer`);
        if (payload.status != null && !isEnumValue(payload.status, DOCUMENT_STATUSES)) addError(res, `${path}.status must be one of: ${DOCUMENT_STATUSES.join(', ')}`);
        if (payload.generatedBy != null) {
            const generatedByResult = validateUserShape(payload.generatedBy, `${path}.generatedBy`);
            if (!generatedByResult.valid) res.errors.push(...generatedByResult.errors);
        }
        if (payload.comments != null && !isString(payload.comments)) addError(res, `${path}.comments must be string`);
        if (Array.isArray(payload.attachments) && deep) {
            payload.attachments.forEach((item, index) => {
                const attachmentResult = validateAttachmentShape(item, `${path}.attachments[${index}]`, false);
                if (!attachmentResult.valid) res.errors.push(...attachmentResult.errors);
            });
        }
        return res;
    }

    function validatePaginationMetaShape(payload, path = 'pagination') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!Number.isInteger(payload.page)) addError(res, `${path}.page is required integer`);
        if (!Number.isInteger(payload.limit)) addError(res, `${path}.limit is required integer`);
        if (!Number.isInteger(payload.total)) addError(res, `${path}.total is required integer`);
        if (!Number.isInteger(payload.totalPages)) addError(res, `${path}.totalPages is required integer`);
        if (payload.hasNext != null && !isBoolean(payload.hasNext)) addError(res, `${path}.hasNext must be boolean`);
        if (payload.hasPrev != null && !isBoolean(payload.hasPrev)) addError(res, `${path}.hasPrev must be boolean`);
        return res;
    }

    function validatePageResponseShape(payload, itemValidator, path = 'pageResponse') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (Array.isArray(payload.data)) {
            payload.data.forEach((item, index) => {
                const itemResult = itemValidator(item, `${path}.data[${index}]`);
                if (!itemResult.valid) res.errors.push(...itemResult.errors);
            });
        } else {
            addError(res, `${path}.data must be an array`);
        }
        if (payload.pagination != null) {
            const paginationResult = validatePaginationMetaShape(payload.pagination, `${path}.pagination`);
            if (!paginationResult.valid) res.errors.push(...paginationResult.errors);
        }
        return res;
    }

    function validatePageResponseIndicatorSheetShape(payload) {
        return validatePageResponseShape(payload, validateIndicatorSheetShape, 'pageResponseIndicatorSheet');
    }

    function validatePageResponseFlowDiagramShape(payload) {
        return validatePageResponseShape(payload, validateFlowDiagramShape, 'pageResponseFlowDiagram');
    }

    function validatePageResponseDocumentShape(payload) {
        return validatePageResponseShape(payload, validateDocumentShape, 'pageResponseDocument');
    }

    function validateNotificationShape(payload, path = 'notification') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!isString(payload.id)) addError(res, `${path}.id is required string`);
        if (!isDateString(payload.date)) addError(res, `${path}.date is required date-time string`);
        if (!isString(payload.code)) addError(res, `${path}.code is required string`);
        if (!isString(payload.description)) addError(res, `${path}.description is required string`);
        if (!isString(payload.subject)) addError(res, `${path}.subject is required string`);
        if (!isString(payload.observations)) addError(res, `${path}.observations is required string`);
        if (payload.generatedBy != null) {
            const generatedByResult = validateUserShape(payload.generatedBy, `${path}.generatedBy`);
            if (!generatedByResult.valid) res.errors.push(...generatedByResult.errors);
        }
        if (payload.recipient != null) {
            const recipientResult = validateUserShape(payload.recipient, `${path}.recipient`);
            if (!recipientResult.valid) res.errors.push(...recipientResult.errors);
        }
        if (payload.document != null) {
            const documentResult = validateDocumentShape(payload.document, `${path}.document`);
            if (!documentResult.valid) res.errors.push(...documentResult.errors);
        }
        if (!isEnumValue(payload.status, NOTIFICATION_STATUSES)) addError(res, `${path}.status must be one of: ${NOTIFICATION_STATUSES.join(', ')}`);
        return res;
    }

    function validateNotificationResponseShape(payload) {
        return validateNotificationShape(payload, 'notification');
    }

    function validateStatsResponseShape(payload) {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, 'payload must be an object');
            return res;
        }

        if (!Number.isInteger(payload.faculties)) addError(res, 'faculties is required integer');
        if (!Number.isInteger(payload.indicators)) addError(res, 'indicators is required integer');
        if (!Number.isInteger(payload.flows)) addError(res, 'flows is required integer');
        if (!Number.isInteger(payload.activeUsers)) addError(res, 'activeUsers is required integer');
        return res;
    }

    function validateIndicatorTrackingShape(payload, path = 'indicatorTracking', deep = true) {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!isString(payload.id)) addError(res, `${path}.id is required string`);
        if (payload.indicatorSheet != null) {
            const indicatorSheetResult = validateIndicatorSheetShape(payload.indicatorSheet, `${path}.indicatorSheet`, false);
            if (!indicatorSheetResult.valid) res.errors.push(...indicatorSheetResult.errors);
        }
        if (!isString(payload.month) || !/^\d{4}-\d{2}$/.test(payload.month)) addError(res, `${path}.month is required and must match YYYY-MM`);
        if (!isNumber(payload.accrued)) addError(res, `${path}.accrued is required number`);
        if (!isNumber(payload.pim)) addError(res, `${path}.pim is required number`);
        if (!isNumber(payload.result)) addError(res, `${path}.result is required number`);
        if (!isNumber(payload.periodTarget)) addError(res, `${path}.periodTarget is required number`);
        if (!isNumber(payload.compliancePercentage)) addError(res, `${path}.compliancePercentage is required number`);
        if (!isString(payload.analysis)) addError(res, `${path}.analysis is required string`);
        if (!isString(payload.observations)) addError(res, `${path}.observations is required string`);
        if (!isString(payload.improvementActions)) addError(res, `${path}.improvementActions is required string`);
        if (!isDateString(payload.createdAt)) addError(res, `${path}.createdAt is required date-time string`);
        return res;
    }

    function validateIndicatorSheetShape(payload, path = 'indicatorSheet', deep = true) {
        const res = makeResult();
        const documentResult = validateDocumentShape(payload, path);
        if (!documentResult.valid) res.errors.push(...documentResult.errors);
        if (!payload || typeof payload !== 'object') {
            res.valid = false;
            return res;
        }

        if (!isString(payload.macroProcess)) addError(res, `${path}.macroProcess is required string`);
        if (!isString(payload.process)) addError(res, `${path}.process is required string`);
        if (!isString(payload.version)) addError(res, `${path}.version is required string`);
        if (!isString(payload.responsibleUnit)) addError(res, `${path}.responsibleUnit is required string`);
        if (payload.processType != null && !PROCESS_TYPES.includes(payload.processType)) addError(res, `${path}.processType must be one of: ${PROCESS_TYPES.join(', ')}`);
        if (!isString(payload.processObjective)) addError(res, `${path}.processObjective is required string`);
        if (!isString(payload.indicatorName)) addError(res, `${path}.indicatorName is required string`);
        if (payload.frequency != null && !FREQUENCIES.includes(payload.frequency)) addError(res, `${path}.frequency must be one of: ${FREQUENCIES.join(', ')}`);
        if (!isString(payload.variables)) addError(res, `${path}.variables is required string`);
        if (!isString(payload.dataSource)) addError(res, `${path}.dataSource is required string`);
        if (!isString(payload.formula)) addError(res, `${path}.formula is required string`);
        if (!isNumber(payload.target)) addError(res, `${path}.target is required number`);
        if (!isString(payload.unit)) addError(res, `${path}.unit is required string`);
        if (payload.trend != null && !isEnumValue(payload.trend, INDICATOR_TRENDS)) addError(res, `${path}.trend must be one of: ${INDICATOR_TRENDS.join(', ')}`);
        if (payload.complianceStatus != null && !isEnumValue(payload.complianceStatus, COMPLIANCE_STATUSES)) addError(res, `${path}.complianceStatus must be one of: ${COMPLIANCE_STATUSES.join(', ')}`);
        if (Array.isArray(payload.trackingData) && deep) {
            payload.trackingData.forEach((item, index) => {
                const trackingResult = validateIndicatorTrackingShape(item, `${path}.trackingData[${index}]`, false);
                if (!trackingResult.valid) res.errors.push(...trackingResult.errors);
            });
        }
        return res;
    }

    function validateFlowDiagramShape(payload, path = 'flowDiagram') {
        const res = makeResult();
        const documentResult = validateDocumentShape(payload, path);
        if (!documentResult.valid) res.errors.push(...documentResult.errors);
        if (!payload || typeof payload !== 'object') {
            res.valid = false;
            return res;
        }

        if (!isString(payload.activityName)) addError(res, `${path}.activityName is required string`);
        if (payload.pdfUrl != null && !isString(payload.pdfUrl)) addError(res, `${path}.pdfUrl must be string or null`);
        if (payload.thumbnailUrl != null && !isString(payload.thumbnailUrl)) addError(res, `${path}.thumbnailUrl must be string or null`);
        return res;
    }

    function validateStatsDocShape(payload, path = 'stats') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!Number.isInteger(payload.pending)) addError(res, `${path}.pending is required integer`);
        if (!Number.isInteger(payload.inProgress)) addError(res, `${path}.inProgress is required integer`);
        if (!Number.isInteger(payload.completed)) addError(res, `${path}.completed is required integer`);
        return res;
    }

    function validateDashboardResponseShape(payload) {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, 'payload must be an object');
            return res;
        }

        if (payload.stats != null) {
            const statsResult = validateStatsDocShape(payload.stats, 'stats');
            if (!statsResult.valid) res.errors.push(...statsResult.errors);
        }
        if (payload.quickActions != null && typeof payload.quickActions !== 'object') addError(res, 'quickActions must be an object');
        if (payload.recentReports != null && typeof payload.recentReports !== 'object') addError(res, 'recentReports must be an object');
        return res;
    }

    function validateByStatusShape(payload, path = 'byStatus') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!Number.isInteger(payload.pending)) addError(res, `${path}.pending is required integer`);
        if (!Number.isInteger(payload.inProgress)) addError(res, `${path}.inProgress is required integer`);
        if (!Number.isInteger(payload.completed)) addError(res, `${path}.completed is required integer`);
        return res;
    }

    function validateByTypeShape(payload, path = 'byType') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!Number.isInteger(payload.indicators)) addError(res, `${path}.indicators is required integer`);
        if (!Number.isInteger(payload.flows)) addError(res, `${path}.flows is required integer`);
        if (!Number.isInteger(payload.characterizations)) addError(res, `${path}.characterizations is required integer`);
        if (!Number.isInteger(payload.reports)) addError(res, `${path}.reports is required integer`);
        return res;
    }

    function validateAdminStatsResponseShape(payload) {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, 'payload must be an object');
            return res;
        }

        if (!Number.isInteger(payload.totalDocuments)) addError(res, 'totalDocuments is required integer');
        if (payload.byStatus != null) {
            const byStatusResult = validateByStatusShape(payload.byStatus, 'byStatus');
            if (!byStatusResult.valid) res.errors.push(...byStatusResult.errors);
        }
        if (payload.byType != null) {
            const byTypeResult = validateByTypeShape(payload.byType, 'byType');
            if (!byTypeResult.valid) res.errors.push(...byTypeResult.errors);
        }
        if (!Number.isInteger(payload.activeFaculties)) addError(res, 'activeFaculties is required integer');
        if (!Number.isInteger(payload.pendingUsers)) addError(res, 'pendingUsers is required integer');
        if (!Number.isInteger(payload.avgApprovalTime)) addError(res, 'avgApprovalTime is required integer');
        return res;
    }

    function validateAccessRequestShape(payload, path = 'accessRequest') {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, `${path} must be an object`);
            return res;
        }

        if (!isString(payload.id)) addError(res, `${path}.id is required string`);
        if (!isString(payload.email)) addError(res, `${path}.email is required string`);
        if (!isString(payload.firstName)) addError(res, `${path}.firstName is required string`);
        if (!isString(payload.lastName)) addError(res, `${path}.lastName is required string`);
        if (payload.faculty != null) {
            const facultyResult = validateFacultyShape(payload.faculty, `${path}.faculty`);
            if (!facultyResult.valid) res.errors.push(...facultyResult.errors);
        }
        if (payload.phone != null && !isString(payload.phone)) addError(res, `${path}.phone must be string`);
        if (payload.position != null && !isString(payload.position)) addError(res, `${path}.position must be string`);
        if (payload.message != null && !isString(payload.message)) addError(res, `${path}.message must be string`);
        if (payload.status != null && !isString(payload.status)) addError(res, `${path}.status must be string`);
        if (payload.requestedAt != null && !isDateString(payload.requestedAt)) addError(res, `${path}.requestedAt must be a date-time string`);
        if (payload.reviewedAt != null && !isDateString(payload.reviewedAt)) addError(res, `${path}.reviewedAt must be a date-time string`);
        if (payload.reviewedBy != null && !isString(payload.reviewedBy)) addError(res, `${path}.reviewedBy must be string`);
        if (payload.rejectionReason != null && !isString(payload.rejectionReason)) addError(res, `${path}.rejectionReason must be string`);
        return res;
    }

    function validateLoginResponseShape(payload) {
        const res = makeResult();
        if (!payload || typeof payload !== 'object') {
            addError(res, 'payload must be an object');
            return res;
        }

        if (!isString(payload.accessToken) && !isString(payload.access_token) && !isString(payload.token)) {
            addError(res, 'accessToken/access_token/token is required');
        }
        if (payload.refreshToken != null && !isString(payload.refreshToken)) addError(res, 'refreshToken must be string');
        if (payload.refresh_token != null && !isString(payload.refresh_token)) addError(res, 'refresh_token must be string');
        if (payload.user != null) {
            const userResult = validateUserShape(payload.user, 'user');
            if (!userResult.valid) res.errors.push(...userResult.errors);
        }
        return res;
    }

    function validateDocumentResponseShape(payload) {
        return validateDocumentShape(payload, 'document');
    }

    function validateHistoryEntryResponseShape(payload) {
        return validateHistoryEntryShape(payload, 'historyEntry', true);
    }

    function validateAttachmentResponseShape(payload) {
        return validateAttachmentShape(payload, 'attachment', true);
    }

    const schemaNames = {
        reportRequest: 'ReportRequest',
        assignmentRequest: 'AssignmentRequest',
        indicatorRequest: 'IndicatorRequest',
        trackingRequest: 'TrackingRequest',
        registerRequest: 'RegisterRequest',
        loginRequest: 'LoginRequest',
        loginResponse: 'LoginResponse',
        notification: 'Notification',
        statsResponse: 'StatsResponse',
        indicatorSheet: 'IndicatorSheet',
        indicatorTracking: 'IndicatorTracking',
        paginationMeta: 'PaginationMeta',
        pageResponseIndicatorSheet: 'PageResponseIndicatorSheet',
        pageResponseFlowDiagram: 'PageResponseFlowDiagram',
        pageResponseDocument: 'PageResponseDocument',
        flowDiagram: 'FlowDiagram',
        statsDoc: 'StatsDoc',
        dashboardResponse: 'DashboardResponse',
        byStatus: 'ByStatus',
        byType: 'ByType',
        adminStatsResponse: 'AdminStatsResponse',
        accessRequest: 'AccessRequest',
        faculty: 'Faculty',
        user: 'UserDto/User',
        document: 'Document',
        historyEntry: 'HistoryEntry',
        attachment: 'Attachment'
    };

    // ReportRequest
    function validateReportRequest(payload){
        const res = makeResult();
        if (!payload || typeof payload !== 'object') { res.valid = false; res.errors.push('Payload must be an object'); return res; }
        if (!isString(payload.semester)) { res.valid = false; res.errors.push('semester is required string'); }
        if (!isString(payload.responsibleName)) { res.valid = false; res.errors.push('responsibleName is required string'); }
        if (!isString(payload.position)) { res.valid = false; res.errors.push('position is required string'); }
        if (!isDateString(payload.elaborationDate)) { res.valid = false; res.errors.push('elaborationDate is required date-string (YYYY-MM-DD)'); }
        return res;
    }

    // AssignmentRequest
    const ASSIGNMENT_CONCEPTS = ['MANTENIMIENTO','PLANILLA','OTROS'];
    function validateAssignmentRequest(payload){
        const res = makeResult();
        if (!payload || typeof payload !== 'object') { res.valid = false; res.errors.push('Payload must be an object'); return res; }
        if (!('assignedAmount' in payload) || !isNumber(payload.assignedAmount)) { res.valid = false; res.errors.push('assignedAmount is required number'); }
        if (!('executedAmount' in payload) || !isNumber(payload.executedAmount)) { res.valid = false; res.errors.push('executedAmount is required number'); }
        if (payload.concept != null && !ASSIGNMENT_CONCEPTS.includes(payload.concept)) { res.valid = false; res.errors.push('concept must be one of: ' + ASSIGNMENT_CONCEPTS.join(', ')); }
        if (payload.assignmentDate != null && !isDateString(payload.assignmentDate)) { res.valid = false; res.errors.push('assignmentDate must be a date-string'); }
        return res;
    }

    // IndicatorRequest
    const PROCESS_TYPES = ['ESTRATEGICO','MISIONAL','SOPORTE'];
    const FREQUENCIES = ['MENSUAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL'];
    function validateIndicatorRequest(payload){
        const res = makeResult();
        if (!payload || typeof payload !== 'object') { res.valid = false; res.errors.push('Payload must be an object'); return res; }
        if (!isString(payload.macroProcess)) { res.valid = false; res.errors.push('macroProcess is required string'); }
        if (!isString(payload.process)) { res.valid = false; res.errors.push('process is required string'); }
        if (!isString(payload.indicatorName)) { res.valid = false; res.errors.push('indicatorName is required string'); }
        if (!isString(payload.formula)) { res.valid = false; res.errors.push('formula is required string'); }
        if (!('target' in payload) || !isNumber(payload.target)) { res.valid = false; res.errors.push('target is required number'); }
        if (payload.processType != null && !PROCESS_TYPES.includes(payload.processType)) { res.valid = false; res.errors.push('processType must be one of: ' + PROCESS_TYPES.join(', ')); }
        if (payload.frequency != null && !FREQUENCIES.includes(payload.frequency)) { res.valid = false; res.errors.push('frequency must be one of: ' + FREQUENCIES.join(', ')); }
        return res;
    }

    // TrackingRequest
    const MONTH_RE = /^\d{4}-\d{2}$/;
    function validateTrackingRequest(payload){
        const res = makeResult();
        if (!payload || typeof payload !== 'object') { res.valid = false; res.errors.push('Payload must be an object'); return res; }
        if (!isString(payload.month) || !MONTH_RE.test(payload.month)) { res.valid = false; res.errors.push('month is required and must match YYYY-MM'); }
        if (!('accrued' in payload) || !isNumber(payload.accrued)) { res.valid = false; res.errors.push('accrued is required number'); }
        if (!('pim' in payload) || !isNumber(payload.pim)) { res.valid = false; res.errors.push('pim is required number'); }
        if (!('result' in payload) || !isNumber(payload.result)) { res.valid = false; res.errors.push('result is required number'); }
        if (!('periodTarget' in payload) || !isNumber(payload.periodTarget)) { res.valid = false; res.errors.push('periodTarget is required number'); }
        return res;
    }

    // RegisterRequest
    const EMAIL_RE = /.+@unmsm\.edu\.pe$/i;
    function validateRegisterRequest(payload){
        const res = makeResult();
        if (!payload || typeof payload !== 'object') { res.valid = false; res.errors.push('Payload must be an object'); return res; }
        if (!isString(payload.email) || !EMAIL_RE.test(payload.email)) { res.valid = false; res.errors.push('email is required and must be @unmsm.edu.pe'); }
        if (!isString(payload.firstName)) { res.valid = false; res.errors.push('firstName is required string'); }
        if (!isString(payload.lastName)) { res.valid = false; res.errors.push('lastName is required string'); }
        if (!isString(payload.facultyId)) { res.valid = false; res.errors.push('facultyId is required string'); }
        return res;
    }

    // LoginRequest
    function validateLoginRequest(payload){
        const res = makeResult();
        if (!payload || typeof payload !== 'object') { res.valid = false; res.errors.push('Payload must be an object'); return res; }
        if (!isString(payload.email)) { res.valid = false; res.errors.push('email is required string'); }
        if (!isString(payload.password)) { res.valid = false; res.errors.push('password is required string'); }
        return res;
    }

    // Simple shape checkers for responses (minimal)
    function isLoginResponseShape(obj){
        return obj && (obj.accessToken || obj.access_token || obj.token) && (obj.refreshToken || obj.refresh_token || obj.refresh);
    }

    // Expose
    return {
        validateReportRequest,
        validateAssignmentRequest,
        validateIndicatorRequest,
        validateTrackingRequest,
        validateRegisterRequest,
        validateLoginRequest,
        isLoginResponseShape,
        validateNotificationShape,
        validateNotificationResponseShape,
        validateStatsResponseShape,
        validateIndicatorSheetShape,
        validateIndicatorTrackingShape,
        validatePaginationMetaShape,
        validatePageResponseShape,
        validatePageResponseIndicatorSheetShape,
        validatePageResponseFlowDiagramShape,
        validatePageResponseDocumentShape,
        validateFlowDiagramShape,
        validateStatsDocShape,
        validateDashboardResponseShape,
        validateByStatusShape,
        validateByTypeShape,
        validateAdminStatsResponseShape,
        validateAccessRequestShape,
        validateFacultyShape,
        validateUserShape,
        validateDocumentShape,
        validateDocumentResponseShape,
        validateHistoryEntryShape,
        validateHistoryEntryResponseShape,
        validateAttachmentShape,
        validateAttachmentResponseShape,
        validateLoginResponseShape,
        validateNotification: validateNotificationShape,
        validateIndicatorSheet: validateIndicatorSheetShape,
        validateIndicatorTracking: validateIndicatorTrackingShape,
        validatePageResponse: validatePageResponseShape,
        validatePageResponseIndicatorSheet: validatePageResponseIndicatorSheetShape,
        validatePageResponseFlowDiagram: validatePageResponseFlowDiagramShape,
        validatePageResponseDocument: validatePageResponseDocumentShape,
        validateFlowDiagram: validateFlowDiagramShape,
        validateDashboardResponse: validateDashboardResponseShape,
        validateAdminStatsResponse: validateAdminStatsResponseShape,
        validateAccessRequest: validateAccessRequestShape,
        validateHistoryEntry: validateHistoryEntryShape,
        schemaNames
    };
})();
