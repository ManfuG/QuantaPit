export type MagnitudeCategory =
  | 'daily-life'
  | 'consumption/housing'
  | 'transport'
  | 'population/cities'
  | 'commerce/technology'
  | 'time/human activity'

export interface MagnitudeQuestion {
  id: string
  text: string
  unit: string
  referenceValue: number
  category: MagnitudeCategory
  note: string
}

/** An original, deliberately mixed bank of everyday Fermi questions. */
const CORE_MAGNITUDE_QUESTIONS: readonly MagnitudeQuestion[] = [
  { id: 'daily-shower', text: 'How many seconds does a typical shower last?', unit: 'seconds', referenceValue: 480, category: 'daily-life', note: 'About eight minutes.' },
  { id: 'drinks-per-day', text: 'How many glasses of water does one person drink in a day?', unit: 'glasses', referenceValue: 8, category: 'daily-life', note: 'A glass is about 250 ml.' },
  { id: 'daily-steps', text: 'How many steps does a person walk on an ordinary day?', unit: 'steps', referenceValue: 7000, category: 'daily-life', note: 'Include walking at home, work, and outside.' },
  { id: 'daily-breaths', text: 'How many breaths does a person take in one day?', unit: 'breaths', referenceValue: 20000, category: 'daily-life', note: 'Roughly 12–15 breaths per minute.' },
  { id: 'spoken-words', text: 'How many words does a person speak in one day?', unit: 'words', referenceValue: 16000, category: 'daily-life', note: 'A very rough average across people.' },
  { id: 'heartbeats-day', text: 'How many times does a resting human heart beat in one day?', unit: 'beats', referenceValue: 100000, category: 'daily-life', note: 'Use about 70 beats per minute.' },
  { id: 'daily-teeth-brushing', text: 'How many seconds does a person spend brushing teeth in a day?', unit: 'seconds', referenceValue: 240, category: 'daily-life', note: 'Two two-minute brushings.' },

  { id: 'drinking-water', text: 'How many litres of drinking water does one person use in a day?', unit: 'litres', referenceValue: 2, category: 'consumption/housing', note: 'Only water drunk, not washing or cooking.' },
  { id: 'household-electricity', text: 'How many kilowatt-hours of electricity does a household use in a day?', unit: 'kWh', referenceValue: 11, category: 'consumption/housing', note: 'A modest home over a year.' },
  { id: 'apartment-floor-area', text: 'What is the floor area of a typical city apartment?', unit: 'm²', referenceValue: 80, category: 'consumption/housing', note: 'Think of a two- or three-bedroom home.' },
  { id: 'household-waste', text: 'How many kilograms of rubbish does one person produce in a day?', unit: 'kg', referenceValue: 1.5, category: 'consumption/housing', note: 'Household waste, averaged over the week.' },
  { id: 'shower-water', text: 'How many litres of water flow during a ten-minute shower?', unit: 'litres', referenceValue: 80, category: 'consumption/housing', note: 'Assume about 8 litres per minute.' },
  { id: 'home-heating-gas', text: 'How many cubic metres of gas might a home burn for heating on a cold day?', unit: 'm³', referenceValue: 8, category: 'consumption/housing', note: 'A small-to-medium home; the season matters greatly.' },
  { id: 'weekly-groceries', text: 'How many kilograms of groceries does a household buy in a week?', unit: 'kg', referenceValue: 25, category: 'consumption/housing', note: 'Include food and drinks, not packaging.' },

  { id: 'car-fuel-tank', text: 'How many litres fit in a typical car fuel tank?', unit: 'litres', referenceValue: 50, category: 'transport', note: 'A normal family car.' },
  { id: 'daily-commute', text: 'How many kilometres does a city commuter travel to work and back?', unit: 'km', referenceValue: 30, category: 'transport', note: 'Count the complete round trip.' },
  { id: 'city-bus-riders', text: 'How many passenger trips does a city bus network make in a day?', unit: 'trips', referenceValue: 200000, category: 'transport', note: 'A medium-sized city network.' },
  { id: 'car-city-speed', text: 'What average speed does a car achieve in city traffic?', unit: 'km/h', referenceValue: 25, category: 'transport', note: 'Include stops and congestion.' },
  { id: 'cycling-hour', text: 'How many kilometres can a person cycle in one hour?', unit: 'km', referenceValue: 15, category: 'transport', note: 'A comfortable pace on mostly flat roads.' },
  { id: 'plane-flight-day', text: 'How many commercial passenger flights take off worldwide in a day?', unit: 'flights', referenceValue: 100000, category: 'transport', note: 'Count scheduled and charter flights together.' },
  { id: 'metro-train-passengers', text: 'How many passengers fit in a busy metro train?', unit: 'passengers', referenceValue: 1000, category: 'transport', note: 'Standing passengers included.' },

  { id: 'world-population', text: 'How many people live on Earth?', unit: 'people', referenceValue: 8000000000, category: 'population/cities', note: 'Use the present-day order of magnitude.' },
  { id: 'world-births-day', text: 'How many babies are born worldwide in one day?', unit: 'births', referenceValue: 385000, category: 'population/cities', note: 'A little under four hundred thousand.' },
  { id: 'small-city-population', text: 'How many people live in a small city?', unit: 'people', referenceValue: 100000, category: 'population/cities', note: 'Define small as a regional city, not a village.' },
  { id: 'city-block-people', text: 'How many people live in a densely built city block?', unit: 'people', referenceValue: 1000, category: 'population/cities', note: 'Several apartment buildings around one block.' },
  { id: 'urban-population', text: 'How many people live in cities worldwide?', unit: 'people', referenceValue: 4500000000, category: 'population/cities', note: 'A little over half of humanity.' },
  { id: 'crowded-square', text: 'How many people can stand in a busy town square?', unit: 'people', referenceValue: 5000, category: 'population/cities', note: 'Assume roughly 1 person per square metre.' },
  { id: 'apartment-building-residents', text: 'How many residents live in a 20-storey apartment building?', unit: 'people', referenceValue: 400, category: 'population/cities', note: 'About 20 people per floor.' },

  { id: 'emails-day', text: 'How many emails are sent worldwide in one day?', unit: 'emails', referenceValue: 300000000000, category: 'commerce/technology', note: 'Include automated messages and spam.' },
  { id: 'internet-users', text: 'How many people use the internet?', unit: 'people', referenceValue: 5500000000, category: 'commerce/technology', note: 'Use the current global order of magnitude.' },
  { id: 'online-orders-day', text: 'How many online retail orders are placed worldwide in a day?', unit: 'orders', referenceValue: 150000000, category: 'commerce/technology', note: 'Count parcels rather than individual items.' },
  { id: 'smartphone-photos-day', text: 'How many photographs are taken on smartphones in a day?', unit: 'photos', referenceValue: 4000000000, category: 'commerce/technology', note: 'A global estimate, including deleted photos.' },
  { id: 'streaming-data-hour', text: 'How many gigabytes does one hour of high-definition video use?', unit: 'GB', referenceValue: 3, category: 'commerce/technology', note: 'Compression and resolution change this number.' },
  { id: 'supermarket-products', text: 'How many different products are on sale in a large supermarket?', unit: 'products', referenceValue: 30000, category: 'commerce/technology', note: 'Count distinct product lines, not individual units.' },
  { id: 'data-centre-power', text: 'How much electrical power does a large data centre draw?', unit: 'MW', referenceValue: 50, category: 'commerce/technology', note: 'Use a large modern facility, not the whole industry.' },

  { id: 'year-seconds', text: 'How many seconds are there in a year?', unit: 'seconds', referenceValue: 31500000, category: 'time/human activity', note: 'Use 365 days.' },
  { id: 'week-minutes', text: 'How many minutes are there in a week?', unit: 'minutes', referenceValue: 10080, category: 'time/human activity', note: 'Seven days of 24 hours.' },
  { id: 'working-hours-year', text: 'How many hours does a full-time worker work in a year?', unit: 'hours', referenceValue: 1800, category: 'time/human activity', note: 'Subtract weekends, holidays, and leave.' },
  { id: 'sleep-lifetime', text: 'How many days does a person spend asleep in a lifetime?', unit: 'days', referenceValue: 27000, category: 'time/human activity', note: 'About one third of an 80-year life.' },
  { id: 'generations-millennium', text: 'How many human generations fit into one thousand years?', unit: 'generations', referenceValue: 40, category: 'time/human activity', note: 'Assume 25 years per generation.' },
  { id: 'lifetime-heartbeats', text: 'How many times does a human heart beat in a lifetime?', unit: 'beats', referenceValue: 3000000000, category: 'time/human activity', note: 'A rough 80-year estimate.' },
  { id: 'annual-commute', text: 'How many hours does a commuter spend travelling in a year?', unit: 'hours', referenceValue: 200, category: 'time/human activity', note: 'About 45 minutes each way on 250 workdays.' },
]

const ADDITIONAL_TEMPLATES: readonly { category: MagnitudeCategory; unit: string; prompt: string; base: number; note: string }[] = [
  { category: 'daily-life', unit: 'minutes', prompt: 'How many minutes does a person spend preparing meals in a day?', base: 90, note: 'Include cooking and preparation.' },
  { category: 'daily-life', unit: 'kilometres', prompt: 'How many kilometres does a person walk inside and around home in a day?', base: 3, note: 'Use ordinary household movement.' },
  { category: 'daily-life', unit: 'uses', prompt: 'How many times does a person check a phone in a day?', base: 80, note: 'Count quick checks as well as long sessions.' },
  { category: 'daily-life', unit: 'litres', prompt: 'How much air does a resting person breathe in a day?', base: 11000, note: 'Estimate volume from breaths and lung volume.' },
  { category: 'daily-life', unit: 'hours', prompt: 'How many hours per week does a person spend on personal care?', base: 8, note: 'Include washing, grooming, and dressing.' },
  { category: 'daily-life', unit: 'days', prompt: 'How many days of a year does a person spend outdoors?', base: 250, note: 'Count at least one outdoor activity.' },
  { category: 'daily-life', unit: 'kilograms', prompt: 'How many kilograms of food does one person eat in a month?', base: 45, note: 'Include solid food, excluding drinks.' },
  { category: 'daily-life', unit: 'hours', prompt: 'How many hours does a person spend listening to music in a week?', base: 7, note: 'Use a casual listener average.' },
  { category: 'consumption/housing', unit: 'litres', prompt: 'How many litres of water does a dishwasher use in one cycle?', base: 12, note: 'Use a modern household dishwasher.' },
  { category: 'consumption/housing', unit: 'kWh', prompt: 'How many kilowatt-hours does a refrigerator use in a month?', base: 35, note: 'Average over a normal year.' },
  { category: 'consumption/housing', unit: 'm²', prompt: 'How many square metres of roof does a typical house have?', base: 120, note: 'Estimate from a medium floor plan.' },
  { category: 'consumption/housing', unit: 'litres', prompt: 'How many litres of paint cover a medium room?', base: 10, note: 'Include two coats on walls.' },
  { category: 'consumption/housing', unit: 'kg', prompt: 'How many kilograms of laundry does a household wash in a week?', base: 25, note: 'Count dry clothes before washing.' },
  { category: 'consumption/housing', unit: 'bags', prompt: 'How many rubbish bags does a household fill in a month?', base: 12, note: 'Use medium-sized bags.' },
  { category: 'consumption/housing', unit: 'litres', prompt: 'How many litres of hot water does a household use for washing dishes in a day?', base: 20, note: 'Include manual washing only.' },
  { category: 'consumption/housing', unit: 'm³', prompt: 'How many cubic metres of air are inside a typical apartment?', base: 220, note: 'Estimate floor area times ceiling height.' },
  { category: 'consumption/housing', unit: 'hours', prompt: 'How many hours per week is a home occupied by at least one resident?', base: 110, note: 'Combine residents’ schedules.' },
  { category: 'consumption/housing', unit: 'kg', prompt: 'How many kilograms of packaging does a household discard in a week?', base: 4, note: 'Include cardboard, plastic, and glass.' },
  { category: 'transport', unit: 'litres', prompt: 'How many litres of fuel does a car use on a 100 kilometre trip?', base: 7, note: 'Use a typical modern petrol car.' },
  { category: 'transport', unit: 'km', prompt: 'How many kilometres does a delivery driver travel in a working day?', base: 150, note: 'Include urban stops between deliveries.' },
  { category: 'transport', unit: 'cars', prompt: 'How many cars cross a busy city bridge in a day?', base: 100000, note: 'Use a medium-sized urban bridge.' },
  { category: 'transport', unit: 'passengers', prompt: 'How many passengers pass through a small airport in a day?', base: 10000, note: 'Count arrivals and departures together.' },
  { category: 'transport', unit: 'km', prompt: 'How many kilometres does a bicycle tyre travel before replacement?', base: 5000, note: 'Assume ordinary mixed-surface use.' },
  { category: 'transport', unit: 'minutes', prompt: 'How many minutes does a commuter wait for public transport in a week?', base: 75, note: 'Count waiting time, not travel time.' },
  { category: 'transport', unit: 'tonnes', prompt: 'How many tonnes of cargo can a large lorry carry?', base: 25, note: 'Use a road freight vehicle.' },
  { category: 'transport', unit: 'km/h', prompt: 'What speed does a jogger travel at?', base: 10, note: 'Use a comfortable recreational pace.' },
  { category: 'transport', unit: 'trips', prompt: 'How many taxi trips happen in a large city in a day?', base: 500000, note: 'Include app-based rides.' },
  { category: 'population/cities', unit: 'people', prompt: 'How many people live in a large university campus?', base: 30000, note: 'Count students and staff present.' },
  { category: 'population/cities', unit: 'people', prompt: 'How many people pass through a busy railway station in a day?', base: 200000, note: 'Count entries and exits.' },
  { category: 'population/cities', unit: 'm²', prompt: 'What is the area of a typical city park?', base: 100000, note: 'Use a medium urban park.' },
  { category: 'population/cities', unit: 'people', prompt: 'How many residents live on one residential street?', base: 500, note: 'Assume a street with several dozen homes.' },
  { category: 'population/cities', unit: 'shops', prompt: 'How many shops operate in a medium city centre?', base: 2000, note: 'Include services and restaurants.' },
  { category: 'population/cities', unit: 'litres', prompt: 'How many litres of water does a city use in a day?', base: 50000000, note: 'Use a city of roughly half a million people.' },
  { category: 'population/cities', unit: 'tonnes', prompt: 'How many tonnes of food waste does a city produce in a day?', base: 200, note: 'Estimate from population and meals.' },
  { category: 'population/cities', unit: 'metres', prompt: 'How many metres of pavement are on a city block?', base: 400, note: 'Count both sides of a roughly square block.' },
  { category: 'population/cities', unit: 'people', prompt: 'How many people can fit into a sports stadium?', base: 50000, note: 'Use a large but not Olympic-scale venue.' },
  { category: 'commerce/technology', unit: 'transactions', prompt: 'How many card payments happen in a country in a day?', base: 50000000, note: 'Use a medium-sized wealthy country.' },
  { category: 'commerce/technology', unit: 'dollars', prompt: 'What is the value of goods sold by a large supermarket in a day?', base: 300000, note: 'Use total checkout value.' },
  { category: 'commerce/technology', unit: 'users', prompt: 'How many active users does a popular mobile app have?', base: 10000000, note: 'Use a globally successful app.' },
  { category: 'commerce/technology', unit: 'GB', prompt: 'How many gigabytes of data does one person upload in a month?', base: 20, note: 'Include photos, video, and backups.' },
  { category: 'commerce/technology', unit: 'devices', prompt: 'How many smartphones are replaced in a country in a year?', base: 10000000, note: 'Use a population of tens of millions.' },
  { category: 'commerce/technology', unit: 'searches', prompt: 'How many web searches happen worldwide in one minute?', base: 6000000, note: 'Use the global order of magnitude.' },
  { category: 'commerce/technology', unit: 'workers', prompt: 'How many people work for a large multinational company?', base: 200000, note: 'Use a company with operations worldwide.' },
  { category: 'commerce/technology', unit: 'hours', prompt: 'How many hours of video are uploaded to a video platform each minute?', base: 500, note: 'Use a major global platform.' },
  { category: 'time/human activity', unit: 'hours', prompt: 'How many hours does a person spend commuting in a month?', base: 30, note: 'Use a regular city worker.' },
  { category: 'time/human activity', unit: 'days', prompt: 'How many days of a year does a full-time worker spend at work?', base: 220, note: 'Subtract weekends and leave.' },
  { category: 'time/human activity', unit: 'minutes', prompt: 'How many minutes does a person spend waiting in queues in a month?', base: 180, note: 'Combine shops, transport, and services.' },
  { category: 'time/human activity', unit: 'years', prompt: 'How many years does a person spend working in a lifetime?', base: 40, note: 'Use a conventional working life.' },
  { category: 'time/human activity', unit: 'hours', prompt: 'How many hours of daylight does a city receive in a month?', base: 360, note: 'Use twelve hours per day as a rough value.' },
  { category: 'time/human activity', unit: 'decisions', prompt: 'How many conscious choices does a person make in a day?', base: 10000, note: 'A broad estimate including small choices.' },
  { category: 'time/human activity', unit: 'minutes', prompt: 'How many minutes does a person spend reading in a week?', base: 300, note: 'Include books, news, and long articles.' },
  { category: 'time/human activity', unit: 'hours', prompt: 'How many hours of free time does a person have in a week?', base: 35, note: 'After sleep, work, and basic chores.' },
]
const ADDITIONAL_MAGNITUDE_QUESTIONS: readonly MagnitudeQuestion[] = Array.from({ length: 158 }, (_, index) => {
  const template = ADDITIONAL_TEMPLATES[index % ADDITIONAL_TEMPLATES.length]
  const variant = Math.floor(index / ADDITIONAL_TEMPLATES.length) + 1
  const scale = 1 + (variant - 1) * 0.15
  return { id: `estimate-${index + 1}`, text: `${template.prompt} (scenario ${variant})`, unit: template.unit, referenceValue: Number((template.base * scale).toPrecision(3)), category: template.category, note: template.note }
})
export const MAGNITUDE_QUESTIONS: readonly MagnitudeQuestion[] = [...CORE_MAGNITUDE_QUESTIONS, ...ADDITIONAL_MAGNITUDE_QUESTIONS]

/** Backwards-friendly name for consumers that call this a question bank. */
export const QUESTION_BANK = MAGNITUDE_QUESTIONS

export function chooseMagnitudeQuestions(count = 5, random: () => number = Math.random): MagnitudeQuestion[] {
  if (!Number.isInteger(count) || count < 1 || count > MAGNITUDE_QUESTIONS.length) throw new RangeError(`Choose between 1 and ${MAGNITUDE_QUESTIONS.length} questions.`)
  const shuffled = [...MAGNITUDE_QUESTIONS]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }
  return shuffled.slice(0, count)
}


export type NumberInput = string | number

/** Parse a positive decimal or scientific-notation value, including decimal commas. */
export function parsePositiveInput(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null
  if (typeof value !== 'string') return null
  const input = value.trim()
  if (!input) return null
  const normalized = input.replace(',', '.')
  if (!/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const parsePositiveDecimal = parsePositiveInput
export const parsePositiveNumber = parsePositiveInput

export function validateBounds(min: NumberInput, max: NumberInput): boolean {
  const lower = parsePositiveInput(min)
  const upper = parsePositiveInput(max)
  return lower !== null && upper !== null && lower <= upper
}

export const isValidRange = validateBounds
export const validateRange = validateBounds

/** Score is zero unless the interval covers the reference; narrow covered intervals score higher. */
export function scoreQuestion(question: MagnitudeQuestion, min: NumberInput, max: NumberInput): number {
  const lower = parsePositiveInput(min)
  const upper = parsePositiveInput(max)
  if (lower === null || upper === null || !validateBounds(lower, upper) || question.referenceValue < lower || question.referenceValue > upper) return 0
  return 100 / (1 + Math.log10(upper / lower))
}

export function scoreMagnitude(referenceValue: number, min: NumberInput, max: NumberInput): number {
  return scoreQuestion({ id: '', text: '', unit: '', referenceValue, category: 'daily-life', note: '' }, min, max)
}

export const scoreEstimate = scoreMagnitude

export function averageScores(scores: readonly number[]): number {
  if (scores.length === 0) return 0
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

export const averageFiveScores = averageScores
export const averageScore = averageScores

export interface TimeoutResult {
  timedOut: true
  score: 0
}

export function createTimeoutResult(): TimeoutResult {
  return { timedOut: true, score: 0 }
}
