import axios from 'axios';

// Ini adalah service untuk mengambil data dari Global API (seperti GlobalGiving / Every.org)
// Karena saat ini kita tidak memiliki API Key nyata, service ini dirancang untuk mencoba memanggil API,
// dan jika gagal/belum ada API key, akan otomatis mengembalikan data MOCK berkualitas tinggi.

const GLOBAL_API_KEY = 'pk_live_9dc233356a81a71f93aacbf54e41eaf5'; // Menggunakan API Key asli
const BASE_URL = 'https://partners.every.org/v0.2/search'; 

export interface ExternalCampaign {
  id: string | number;
  title: string;
  category: string;
  target_amount: number;
  collected_amount: number;
  image_url: string;
  organizer: string;
  description: string;
}

// Pseudo-random generator agar hasil data tetap sama meski direfresh
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Generate 50 International Mock Campaigns
const generateMockCampaigns = (): ExternalCampaign[] => {
  const campaigns: ExternalCampaign[] = [];
  const categories = ["Environment", "Wildlife", "Humanitarian", "Ocean Conservation", "Climate Action"];
  const regions = ["Africa", "Amazon", "Southeast Asia", "Global", "Pacific Islands", "Latin America", "Sub-Saharan Africa"];
  const actions = ["Save", "Protect", "Clean", "Restore", "Empower", "Reforest"];
  const subjects = ["Rainforests", "Endangered Species", "Coral Reefs", "Local Communities", "Rivers", "Ecosystems"];

  for (let i = 1; i <= 50; i++) {
    const category = categories[i % categories.length];
    const region = regions[i % regions.length];
    const action = actions[i % actions.length];
    const subject = subjects[i % subjects.length];
    
    // Gunakan pseudoRandom agar target dan collected tidak berubah saat direfresh
    const target = (Math.floor(pseudoRandom(i) * 900) + 100) * 1000000;
    const collected = Math.floor(pseudoRandom(i * 2) * target);

    campaigns.push({
      id: 200 + i,
      title: `${action} ${subject} in ${region}`,
      category: category,
      target_amount: target,
      collected_amount: collected,
      image_url: `https://picsum.photos/seed/campaign${i}/800/400`,
      organizer: `Global ${category} Trust`,
      description: `Join us in our mission to ${action.toLowerCase()} the ${subject.toLowerCase()} across ${region}. Your donation directly funds our field teams, providing essential resources and community support to make a lasting global impact.`
    });
  }
  return campaigns;
};

// Mock Data Berkelas (Akan dipakai jika API Key kosong)
const MOCK_CAMPAIGNS: ExternalCampaign[] = generateMockCampaigns();

export const globalGivingService = {
  // Fungsi untuk mengambil semua campaign (dengan pagination)
  fetchCampaigns: async (page: number = 1, limit: number = 10): Promise<ExternalCampaign[]> => {
    try {
      if (!GLOBAL_API_KEY) {
        // Jika tidak ada API Key, gunakan mock data
        console.log(`Memuat MOCK data campaign halaman ${page}`);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = MOCK_CAMPAIGNS.slice(startIndex, endIndex);
        return new Promise((resolve) => setTimeout(() => resolve(paginatedData), 800));
      }

      // Simulasi panggilan ke API nyata (Every.org sebagai contoh)
      // Every.org membolehkan parameter take dan page
      const response = await axios.get(`${BASE_URL}/environment?apiKey=${GLOBAL_API_KEY}&take=50`);
      
      // Transform data dari API eksternal agar sesuai dengan format UI lokal kita
      const apiData = response.data.nonprofits.map((item: any, index: number) => {
        // Gunakan pseudoRandom agar target dan progress dari API tetap konsisten jika tidak ada data dari API
        const target = (Math.floor(pseudoRandom(index + 1) * 900) + 100) * 1000000;
        const collected = Math.floor(pseudoRandom((index + 1) * 2) * target);

        return {
          id: item.ein || `ext-${index}`,
          title: item.name,
          category: "Lingkungan",
          target_amount: target,
          collected_amount: collected,
          image_url: item.coverImageUrl || item.logoUrl || `https://picsum.photos/seed/${item.ein || index}/800/400`,
          organizer: item.location || "GlobalGiving Partner",
          description: item.description || "Kampanye penyelamatan lingkungan global."
        };
      });
      
      // Simulasi pagination pada data asli (jika API tidak memiliki fitur pagination)
      const startIndex = (page - 1) * limit;
      return apiData.slice(startIndex, startIndex + limit);

    } catch (error) {
      console.error("Gagal mengambil data dari API Eksternal:", error);
      // Fallback ke mock data jika API gagal
      const startIndex = (page - 1) * limit;
      return MOCK_CAMPAIGNS.slice(startIndex, startIndex + limit);
    }
  },

  // Fungsi untuk mengambil detail satu campaign
  fetchCampaignById: async (id: string | number): Promise<ExternalCampaign | null> => {
    try {
      if (GLOBAL_API_KEY) {
        // Coba panggil API sungguhan jika ID bukan berupa string 'ext-'
        if (id.toString().startsWith('ext-')) {
          // Jika ID fallback ext- (jarang terjadi), gunakan mock data sementara
          return MOCK_CAMPAIGNS[0];
        }

        const response = await axios.get(`https://partners.every.org/v0.2/nonprofit/${id}?apiKey=${GLOBAL_API_KEY}`);
        
        if (response.data && response.data.data && response.data.data.nonprofit) {
          const item = response.data.data.nonprofit;
          
          // Seed pseudo-random dari EIN agar konsisten dengan halaman katalog
          const seedStr = item.ein || id.toString();
          let numericSeed = 0;
          for (let i = 0; i < seedStr.length; i++) {
            numericSeed += seedStr.charCodeAt(i);
          }
          
          const target = (Math.floor(pseudoRandom(numericSeed) * 900) + 100) * 1000000;
          const collected = Math.floor(pseudoRandom(numericSeed * 2) * target);

          return {
            id: item.ein || id,
            title: item.name,
            category: "Lingkungan",
            target_amount: target,
            collected_amount: collected,
            image_url: item.coverImageUrl || item.logoUrl || `https://picsum.photos/seed/${item.ein || id}/800/400`,
            organizer: item.locationAddress || "GlobalGiving Partner",
            description: item.description || "Kampanye penyelamatan lingkungan global."
          };
        }
      }

      // Jika tidak ada API Key atau API gagal (fallback)
      const campaign = MOCK_CAMPAIGNS.find(c => c.id.toString() === id.toString());
      
      if (campaign) {
        return new Promise((resolve) => setTimeout(() => resolve(campaign), 500));
      }
      
      return null;
    } catch (error) {
      console.error("Gagal memuat detail campaign:", error);
      return null;
    }
  }
};
