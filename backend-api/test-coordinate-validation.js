/**
 * Manual Test Script for Coordinate Validation
 * Tests the coordinate validator with various scenarios
 */

const { validateFull, validateCoordinates, detectSwappedCoordinates } = require('./utils/coordinateValidator');

console.log('🧪 Testing Coordinate Validation...\n');

// Test cases
const testCases = [
  {
    name: 'Valid Jakarta coordinates',
    lat: -6.2088,
    lng: 106.8456,
    expected: 'valid'
  },
  {
    name: 'Valid Surabaya coordinates',
    lat: -7.2575,
    lng: 112.7521,
    expected: 'valid'
  },
  {
    name: 'Valid Bali coordinates',
    lat: -8.4095,
    lng: 115.1889,
    expected: 'valid'
  },
  {
    name: 'Out of global range - latitude too high',
    lat: 200,
    lng: 106.8456,
    expected: 'invalid'
  },
  {
    name: 'Out of global range - longitude too high',
    lat: -6.2088,
    lng: 300,
    expected: 'invalid'
  },
  {
    name: 'Swapped coordinates (Jakarta)',
    lat: 106.8456,
    lng: -6.2088,
    expected: 'invalid'
  },
  {
    name: 'Valid but outside Indonesia (New York)',
    lat: 40.7128,
    lng: -74.0060,
    expected: 'warning'
  },
  {
    name: 'Valid but outside Indonesia (London)',
    lat: 51.5074,
    lng: -0.1278,
    expected: 'warning'
  },
  {
    name: 'Edge case - Indonesia boundary',
    lat: -10.9,
    lng: 95.1,
    expected: 'valid'
  },
  {
    name: 'Zero coordinates',
    lat: 0,
    lng: 0,
    expected: 'warning'
  }
];

let passedCount = 0;
let failedCount = 0;

testCases.forEach((test, index) => {
  console.log(`─────────────────────────────────────`);
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`Input: lat=${test.lat}, lng=${test.lng}`);
  
  const result = validateFull(test.lat, test.lng);
  
  let actualResult;
  if (!result.valid) {
    actualResult = 'invalid';
    console.log(`❌ Result: INVALID`);
    console.log(`   Error: ${result.error}`);
  } else if (result.warning) {
    actualResult = 'warning';
    console.log(`⚠️  Result: WARNING`);
    console.log(`   Warning: ${result.warning}`);
  } else {
    actualResult = 'valid';
    console.log(`✅ Result: VALID`);
  }
  
  const passed = actualResult === test.expected;
  if (passed) {
    console.log(`✓ Test PASSED`);
    passedCount++;
  } else {
    console.log(`✗ Test FAILED (expected: ${test.expected}, got: ${actualResult})`);
    failedCount++;
  }
});

console.log(`─────────────────────────────────────\n`);
console.log('═══════════════════════════════════════');
console.log('           TEST SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`✅ Passed: ${passedCount}`);
console.log(`❌ Failed: ${failedCount}`);
console.log(`📊 Total:  ${testCases.length}`);
console.log('═══════════════════════════════════════\n');

// Test swap detection specifically
console.log('🔍 Testing Swap Detection:\n');

const swapTests = [
  { lat: -6.2088, lng: 106.8456, shouldDetect: false, desc: 'Normal Jakarta' },
  { lat: 106.8456, lng: -6.2088, shouldDetect: true, desc: 'Swapped Jakarta' },
  { lat: -7.2575, lng: 112.7521, shouldDetect: false, desc: 'Normal Surabaya' },
  { lat: 112.7521, lng: -7.2575, shouldDetect: true, desc: 'Swapped Surabaya' }
];

swapTests.forEach(test => {
  const result = detectSwappedCoordinates(test.lat, test.lng);
  const detected = result.swapped;
  const match = detected === test.shouldDetect;
  
  console.log(`${match ? '✓' : '✗'} ${test.desc}: lat=${test.lat}, lng=${test.lng}`);
  console.log(`  Expected swap: ${test.shouldDetect}, Detected: ${detected}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
  console.log('');
});

console.log('✅ Testing complete!\n');
