// Quick test script untuk verify Photon API integration
// Run dengan: node test-geocoding.js

const testGeocoding = async () => {
  console.log('🧪 Testing Photon Geocoding API...\n');
  
  // Test 1: Forward Geocoding (Search)
  console.log('1️⃣ Testing Forward Geocoding (Search "Jakarta")...');
  try {
    const searchUrl = 'https://photon.komoot.io/api?q=Jakarta&lang=id&limit=3';
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    console.log(`   Response status: ${searchResponse.status}`);
    console.log(`   Features count: ${searchData.features?.length || 0}`);
    
    if (searchData.features && searchData.features.length > 0) {
      console.log('✅ Forward Geocoding SUCCESS');
      console.log(`   First result: ${searchData.features[0].properties.name || 'N/A'}`);
    } else {
      console.log('⚠️  API responded but no features (might be temporary)');
    }
  } catch (error) {
    console.log('❌ Forward Geocoding FAILED:', error.message);
  }
  
  console.log('');
  
  // Test 2: Reverse Geocoding
  console.log('2️⃣ Testing Reverse Geocoding (Monas coordinates)...');
  try {
    const reverseUrl = 'https://photon.komoot.io/reverse?lon=106.8272&lat=-6.1751&lang=id';
    const reverseResponse = await fetch(reverseUrl);
    const reverseData = await reverseResponse.json();
    
    if (reverseData.features && reverseData.features.length > 0) {
      console.log('✅ Reverse Geocoding SUCCESS');
      console.log(`   Address: ${reverseData.features[0].properties.name || reverseData.features[0].properties.street}`);
      console.log(`   City: ${reverseData.features[0].properties.city}`);
    } else {
      console.log('❌ No results found');
    }
  } catch (error) {
    console.log('❌ Reverse Geocoding FAILED:', error.message);
  }
  
  console.log('');
  
  // Test 3: OpenFreeMap Tile Availability
  console.log('3️⃣ Testing OpenFreeMap Tile Server...');
  try {
    const tileUrl = 'https://tiles.openfreemap.org/styles/liberty';
    const tileResponse = await fetch(tileUrl);
    
    if (tileResponse.ok) {
      console.log('✅ OpenFreeMap Tile Server ACCESSIBLE');
      console.log(`   Status: ${tileResponse.status}`);
    } else {
      console.log('❌ OpenFreeMap Tile Server FAILED:', tileResponse.status);
    }
  } catch (error) {
    console.log('❌ OpenFreeMap Tile Server FAILED:', error.message);
  }
  
  console.log('\n✨ All tests completed!');
};

testGeocoding();
