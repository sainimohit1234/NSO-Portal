// ─── Cafe Model Options ───
export const CAFE_MODELS = [
  'Core',
  'Core Cafe',
  'Makeline',
  'BTC+',
  'Airport',
  'Origins',
  'Got Tea',
  'University',
  'SIS/Others',
  'test',
];

// ─── Menu Options ───
export const MENU_OPTIONS = [
  'Pre Ver1',
  'Reg Ver1',
  'Pre BTC+',
  'Air',
  'Reg BTC+',
  'Pre Origin',
  'Reg BTC+ CWK',
  'Pre BTC+ CWK',
  'Pre V3',
  'KIOSK Ver3',
  'Pre Veg',
  'Pre KIOSK Ver2',
  'Reg Ver2',
  'KIOSK Ver6',
  'Pre Ver2',
  'KIOSK Ver4',
  'KIOSK Ver7',
  'Sattva',
  'Reg KIOSK Ver9',
  'KIOSK Ver8',
  'KIOSK Ver5',
  'Pre KIOSK',
];

// ─── Indian States & Union Territories ───
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

// ─── Indian Cities mapped by State ───
export const STATE_CITIES_MAP = {
  'Andhra Pradesh': ['Amaravati', 'Anantapur', 'Guntur', 'Kakinada', 'Kurnool', 'Nellore', 'Rajahmundry', 'Tirupati', 'Vijayawada', 'Visakhapatnam'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  'Assam': ['Dibrugarh', 'Guwahati', 'Jorhat', 'Silchar', 'Tezpur', 'Tinsukia'],
  'Bihar': ['Bhagalpur', 'Gaya', 'Muzaffarpur', 'Patna', 'Purnia'],
  'Chandigarh': ['Chandigarh'],
  'Chhattisgarh': ['Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Raipur', 'Rajnandgaon'],
  'Delhi': ['New Delhi'],
  'Goa': ['Mapusa', 'Margao', 'Panaji', 'Vasco da Gama'],
  'Gujarat': ['Ahmedabad', 'Anand', 'Bhavnagar', 'Gandhinagar', 'Jamnagar', 'Junagadh', 'Morbi', 'Rajkot', 'Surat', 'Vadodara'],
  'Haryana': ['Ambala', 'Faridabad', 'Gurugram', 'Hisar', 'Karnal', 'Panipat', 'Rohtak', 'Sonipat', 'Yamunanagar'],
  'Himachal Pradesh': ['Dharamshala', 'Kullu', 'Manali', 'Shimla', 'Solan'],
  'Jammu and Kashmir': ['Jammu', 'Srinagar'],
  'Jharkhand': ['Bokaro Steel City', 'Dhanbad', 'Hazaribag', 'Jamshedpur', 'Ranchi'],
  'Karnataka': ['Bengaluru', 'Belgaum', 'Davangere', 'Hubli-Dharwad', 'Mangaluru', 'Mysuru', 'Shimoga', 'Tumkur', 'Udupi'],
  'Kerala': ['Ernakulam', 'Kochi', 'Kollam', 'Kozhikode', 'Thiruvananthapuram', 'Thrissur'],
  'Ladakh': ['Leh'],
  'Madhya Pradesh': ['Bhopal', 'Gwalior', 'Indore', 'Jabalpur', 'Sagar', 'Ujjain'],
  'Maharashtra': ['Aurangabad', 'Kolhapur', 'Mumbai', 'Nagpur', 'Nashik', 'Navi Mumbai', 'Pune', 'Solapur', 'Thane'],
  'Manipur': ['Imphal'],
  'Meghalaya': ['Shillong'],
  'Mizoram': ['Aizawl'],
  'Nagaland': ['Dimapur', 'Kohima'],
  'Odisha': ['Bhubaneswar', 'Brahmapur', 'Cuttack', 'Rourkela', 'Sambalpur'],
  'Puducherry': ['Puducherry'],
  'Punjab': ['Amritsar', 'Bathinda', 'Jalandhar', 'Ludhiana', 'Mohali', 'Patiala'],
  'Rajasthan': ['Ajmer', 'Bikaner', 'Jaipur', 'Jodhpur', 'Kota', 'Udaipur'],
  'Sikkim': ['Gangtok'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Erode', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Vellore'],
  'Telangana': ['Hyderabad', 'Karimnagar', 'Nizamabad', 'Warangal'],
  'Tripura': ['Agartala'],
  'Uttar Pradesh': ['Agra', 'Aligarh', 'Allahabad', 'Bareilly', 'Ghaziabad', 'Gorakhpur', 'Greater Noida', 'Jhansi', 'Kanpur', 'Lucknow', 'Mathura', 'Meerut', 'Moradabad', 'Noida', 'Varanasi'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Mussoorie', 'Nainital', 'Rishikesh'],
  'West Bengal': ['Asansol', 'Durgapur', 'Howrah', 'Kolkata', 'Siliguri']
};

export const INDIAN_CITIES = Object.values(STATE_CITIES_MAP).flat().sort();

// ─── Month names for Launch Month & Year dropdown ───
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Generate year options: current year -2 to current year +5
const currentYear = new Date().getFullYear();
export const LAUNCH_YEARS = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i);
