# MCP Request Trace: "Activity from last 12 hours with anomalies"

## When Claude receives the prompt:
**"Using the 'cdata-arc-server' MCP connection, provide a summary of the activity from the last 12 hours, paying particular attention to any anomalies."**

Claude would likely call these MCP tools in sequence:

---

## 1. get_recent_files

### Tool Call:
```json
{
  "name": "get_recent_files",
  "arguments": {
    "hours": 12,
    "top": 50
  }
}
```

### What the handler does:
```typescript
// Calculate cutoff date
const hours = 12
const cutoffDate = new Date(Date.now() - 12 * 60 * 60 * 1000)
const isoDate = cutoffDate.toISOString()
// Example: "2025-10-02T14:30:00.000Z"

// Build query params
const queryParams = {
  $filter: `TimeCreated ge '${isoDate}'`,  // "TimeCreated ge '2025-10-02T14:30:00.000Z'"
  $orderby: 'TimeCreated DESC',
  $top: 50
}
```

### Actual HTTP Request:
```
GET http://localhost:8181/api.rsc/files?$filter=TimeCreated%20ge%20'2025-10-02T14:30:00.000Z'&$orderby=TimeCreated%20DESC&$top=50
Headers:
  Content-Type: application/json
  Accept: application/json
  x-cdata-authtoken: <token>
```

### Potential Issues:
1. **OData datetime format**: OData v4 may require `datetime'2025-10-02T14:30:00.000Z'` instead of just `'2025-10-02T14:30:00.000Z'`
2. **URL encoding**: Single quotes might need to be encoded differently
3. **Timezone handling**: The `Z` suffix might not be recognized by the Arc API

---

## 2. get_error_logs

### Tool Call:
```json
{
  "name": "get_error_logs",
  "arguments": {
    "hours": 12,
    "top": 20
  }
}
```

### What the handler does:
```typescript
// Calculate cutoff date
const hours = 12
const cutoffDate = new Date(Date.now() - 12 * 60 * 60 * 1000)
const isoDate = cutoffDate.toISOString()
// Example: "2025-10-02T14:30:00.000Z"

// Build filter
let filter = `Timestamp ge '${isoDate}' and Level eq 'Error'`
// "Timestamp ge '2025-10-02T14:30:00.000Z' and Level eq 'Error'"

// Build query params
const queryParams = {
  $filter: filter,
  $orderby: 'Timestamp DESC',
  $top: 20
}
```

### Actual HTTP Request:
```
GET http://localhost:8181/api.rsc/logs?$filter=Timestamp%20ge%20'2025-10-02T14:30:00.000Z'%20and%20Level%20eq%20'Error'&$orderby=Timestamp%20DESC&$top=20
Headers:
  Content-Type: application/json
  Accept: application/json
  x-cdata-authtoken: <token>
```

### Same Potential Issues:
1. **OData datetime format**: May need `datetime'...'` prefix
2. **URL encoding**: Quote handling
3. **Timezone format**: The `Z` suffix

---

## 3. get_recent_transactions

### Tool Call:
```json
{
  "name": "get_recent_transactions",
  "arguments": {
    "hours": 12,
    "top": 50
  }
}
```

### What the handler does:
```typescript
// Calculate cutoff date
const hours = 12
const cutoffDate = new Date(Date.now() - 12 * 60 * 60 * 1000)
const isoDate = cutoffDate.toISOString()
// Example: "2025-10-02T14:30:00.000Z"

// Build query params
const queryParams = {
  $filter: `Timestamp ge '${isoDate}'`,  // "Timestamp ge '2025-10-02T14:30:00.000Z'"
  $orderby: 'Timestamp DESC',
  $top: 50
}
```

### Actual HTTP Request:
```
GET http://localhost:8181/api.rsc/transactions?$filter=Timestamp%20ge%20'2025-10-02T14:30:00.000Z'&$orderby=Timestamp%20DESC&$top=50
Headers:
  Content-Type: application/json
  Accept: application/json
  x-cdata-authtoken: <token>
```

---

## Debugging the 400 Bad Request

### Possible Root Causes:

1. **OData v4 datetime literal format**
   - Current: `Timestamp ge '2025-10-02T14:30:00.000Z'`
   - OData v4 spec: `Timestamp ge 2025-10-02T14:30:00.000Z` (no quotes!)
   - OData v3 spec: `Timestamp ge datetime'2025-10-02T14:30:00.000Z'`

2. **CData Arc API version**
   - The Arc API might use a specific OData version or custom datetime format
   - Need to check: What version of OData does CData Arc implement?

3. **Property name case sensitivity**
   - Check if properties should be `timeCreated` vs `TimeCreated`
   - Check if properties should be `timestamp` vs `Timestamp`

4. **Alternative date formats Arc might expect:**
   - ISO 8601 without quotes: `Timestamp ge 2025-10-02T14:30:00Z`
   - ISO 8601 without milliseconds: `Timestamp ge 2025-10-02T14:30:00Z`
   - Custom format: `Timestamp ge '2025-10-02 14:30:00'`
   - Unix timestamp: `Timestamp ge 1727880600`

---

## Recommended Next Steps:

1. **Check Arc API documentation** for exact OData datetime filter syntax
2. **Test with simple filter** (no datetime) to verify base connectivity
3. **Try different datetime formats:**
   ```typescript
   // Test 1: No quotes (OData v4)
   $filter: `Timestamp ge ${isoDate}`

   // Test 2: OData v3 format
   $filter: `Timestamp ge datetime'${isoDate}'`

   // Test 3: Different ISO format
   const isoDate = cutoffDate.toISOString().replace('.000Z', 'Z')
   $filter: `Timestamp ge '${isoDate}'`
   ```

4. **Enable verbose logging** to see exact URL being constructed
5. **Use Postman/curl** to test the API directly with different formats
