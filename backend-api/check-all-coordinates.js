/**
 * Data Audit Script - Check All Coordinates
 * Scans existing pickup_orders for invalid or swapped coordinates
 * DOES NOT auto-fix - only reports for manual review
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { validateFull } = require('./utils/coordinateValidator');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Starting coordinate audit...\n');

db.all('SELECT id, user_id, pickup_address, latitude, longitude, status, created_at FROM pickup_orders', [], (err, orders) => {
  if (err) {
    console.error('❌ Error reading database:', err.message);
    db.close();
    return;
  }

  if (!orders || orders.length === 0) {
    console.log('ℹ️  No pickup orders found in database.');
    db.close();
    return;
  }

  console.log(`📊 Total orders to check: ${orders.length}\n`);

  let validCount = 0;
  let invalidCount = 0;
  let warningCount = 0;
  let nullCount = 0;
  const issues = [];

  orders.forEach(order => {
    // Check for null/missing coordinates
    if (order.latitude === null || order.longitude === null) {
      nullCount++;
      issues.push({
        order_id: order.id,
        issue: 'MISSING_COORDINATES',
        latitude: order.latitude,
        longitude: order.longitude,
        address: order.pickup_address,
        status: order.status,
        created_at: order.created_at
      });
      return;
    }

    // Validate coordinates
    const validation = validateFull(order.latitude, order.longitude);

    if (!validation.valid) {
      invalidCount++;
      issues.push({
        order_id: order.id,
        issue: 'INVALID',
        error: validation.error,
        latitude: order.latitude,
        longitude: order.longitude,
        address: order.pickup_address,
        status: order.status,
        created_at: order.created_at
      });
    } else if (validation.warning) {
      warningCount++;
      issues.push({
        order_id: order.id,
        issue: 'WARNING',
        warning: validation.warning,
        latitude: order.latitude,
        longitude: order.longitude,
        address: order.pickup_address,
        status: order.status,
        created_at: order.created_at
      });
    } else {
      validCount++;
    }
  });

  // Print summary
  console.log('═══════════════════════════════════════');
  console.log('            AUDIT SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Valid coordinates:        ${validCount}`);
  console.log(`⚠️  Outside Indonesia bounds: ${warningCount}`);
  console.log(`❌ Invalid coordinates:      ${invalidCount}`);
  console.log(`🚫 Missing coordinates:      ${nullCount}`);
  console.log(`📊 Total orders checked:     ${orders.length}`);
  console.log('═══════════════════════════════════════\n');

  // Print detailed issues if any
  if (issues.length > 0) {
    console.log('📋 DETAILED ISSUES:\n');

    issues.forEach(issue => {
      console.log(`─────────────────────────────────────`);
      console.log(`Order ID: #${issue.order_id}`);
      console.log(`Status: ${issue.status}`);
      console.log(`Issue Type: ${issue.issue}`);
      
      if (issue.issue === 'MISSING_COORDINATES') {
        console.log(`Latitude: ${issue.latitude}`);
        console.log(`Longitude: ${issue.longitude}`);
      } else {
        console.log(`Latitude: ${issue.latitude}`);
        console.log(`Longitude: ${issue.longitude}`);
      }
      
      console.log(`Address: ${issue.address || 'N/A'}`);
      
      if (issue.error) {
        console.log(`❌ Error: ${issue.error}`);
      }
      
      if (issue.warning) {
        console.log(`⚠️  Warning: ${issue.warning}`);
      }
      
      console.log(`Created: ${issue.created_at}`);
    });

    console.log('─────────────────────────────────────\n');
  }

  // Recommendations
  if (invalidCount > 0 || nullCount > 0) {
    console.log('🔧 RECOMMENDATIONS:\n');
    console.log('1. Review invalid/missing coordinates manually');
    console.log('2. Contact users to verify correct coordinates');
    console.log('3. Update coordinates in database if needed');
    console.log('4. Consider implementing coordinate fix migration\n');
  }

  if (warningCount > 0) {
    console.log('ℹ️  NOTE: Orders outside Indonesia bounds are flagged but may be valid');
    console.log('   (e.g., users traveling abroad). Review these manually.\n');
  }

  console.log('✅ Audit complete!\n');

  db.close();
});
