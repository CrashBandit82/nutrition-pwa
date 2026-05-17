import React, { useState, useEffect } from 'react'
import axios from 'axios'
import BarcodeScanner from './BarcodeScanner'

const DEFAULT_GOALS = {
  calories: 2800,
  protein: 200,
  carbs: 320,
  fat: 80,
}

const COLORS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-500',
  'from-blue-500 to-cyan-500',
  'from-teal-500 to-emerald-500',
  'from-green-500 to-lime-500',
  'from-yellow-500 to-amber-500',
  'from-orange-500 to-red-500',
  'from-fuchsia-500 to-pink-500',
  'from-violet-500 to-purple-500',
  'from-sky-500 to-blue-600',
]

const API_BASE = '/api'

export default function Dashboard() {
  const [activeUser, setActiveUser] = useState(() => {
    const saved = localStorage.getItem('active_user_id')
    return saved ? parseInt(saved, 10) : 1
  })

  // Dynamische Liste der 10 User-Namen aus dem lokalen Speicher laden
  const [userNames, setUserNames] = useState(() => {
    const list = []
    for (let i = 1; i <= 10; i++) {
      const savedName = localStorage.getItem('user_custom_name_' + i)
      list.push({
        id: i,
        name: savedName || ('Benutzer ' + i),
        color: COLORS[i - 1]
      })
    }
    return list
  })

  const [macroGoals, setMacroGoals] = useState(() => {
    const savedUser = localStorage.getItem('active_user_id') || '1'
    const saved = localStorage.getItem('macro_goals_user_' + savedUser)
    return saved ? JSON.parse(saved) : DEFAULT_GOALS
  })

  const [totals, setTotals] = useState(null)
  const [logs, setLogs] = useState([])
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showScanner, setShowScanner] = useState(false)
  const [showAddManual, setShowAddManual] = useState(false)
  const [showEditGoals, setShowEditGoals] = useState(false)
  const [showEditName, setShowEditName] = useState(false)
  const [selectedFood, setSelectedFood] = useState(null)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [apiLoading, setApiLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('search')

  const [customName, setCustomName] = useState('')
  const [customKcal, setCustomKcal] = useState('')
  const [customProtein, setCustomProtein] = useState('')
  const [customCarbs, setCustomCarbs] = useState('')
  const [customFat, setCustomFat] = useState('')
  const [customAmount, setCustomAmount] = useState('')

  const [goalInputKcal, setGoalInputKcal] = useState('')
  const [goalInputProtein, setGoalInputProtein] = useState('')
  const [goalInputCarbs, setGoalInputCarbs] = useState('')
  const [goalInputFat, setGoalInputFat] = useState('')
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    localStorage.setItem('active_user_id', activeUser)
    const savedGoals = localStorage.getItem('macro_goals_user_' + activeUser)
    setMacroGoals(savedGoals ? JSON.parse(savedGoals) : DEFAULT_GOALS)
    loadDashboard()
    loadFoods()
  }, [activeUser])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const [totalsRes, logsRes] = await Promise.all([
        axios.get(API_BASE + '/totals/today?user_id=' + activeUser),
        axios.get(API_BASE + '/logs/today?user_id=' + activeUser),
      ])
      setTotals(totalsRes.data)
      setLogs(logsRes.data)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const loadFoods = async () => {
    try {
      const res = await axios.get(API_BASE + '/foods')
      setFoods(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleBarcodeScanned = async (barcode) => {
    setShowScanner(false)
    setApiLoading(true)
    try {
      const res = await axios.get(API_BASE + '/barcode/' + barcode)
      setSelectedFood({
        id: -1,
        name: res.data.name,
        brand: res.data.brand,
        calories_per_100g: res.data.calories_per_100g,
        protein_per_100g: res.data.protein_per_100g,
        carbs_per_100g: res.data.carbs_per_100g,
        fat_per_100g: res.data.fat_per_100g,
      })
      setActiveTab('search')
      setShowAddManual(true)
      setError(null)
    } catch (err) {
      setError('Produkt nicht gefunden. Bitte manuell anlegen.')
      setActiveTab('custom')
      setShowAddManual(true)
    } finally {
      setApiLoading(false)
    }
  }

  const handleAddMeal = async () => {
    if (!selectedFood || !amount) return
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Menge muss eine positive Zahl sein')
      return
    }
    setApiLoading(true)
    try {
      let currentFoodId = selectedFood.id
      if (currentFoodId === -1) {
        const newFoodResponse = await axios.post(API_BASE + '/foods', {
          name: selectedFood.name,
          brand: selectedFood.brand || '',
          calories_per_100g: selectedFood.calories_per_100g,
          protein_per_100g: selectedFood.protein_per_100g,
          carbs_per_100g: selectedFood.carbs_per_100g,
          fat_per_100g: selectedFood.fat_per_100g,
        })
        currentFoodId = newFoodResponse.data.id
        loadFoods()
      }
      await axios.post(API_BASE + '/logs?user_id=' + activeUser, {
        food_item_id: currentFoodId,
        amount_grams: amountNum,
      })
      setSuccess(selectedFood.name + ' hinzugefügt')
      setSelectedFood(null)
      setAmount('')
      setShowAddManual(false)
      await loadDashboard()
    } catch (err) {
      setError('Fehler beim Speichern')
    } finally {
      setApiLoading(false)
    }
  }

  const handleCreateCustomMeal = async (e) => {
    e.preventDefault()
    if (!customName || !customKcal || !customAmount) {
      setError('Bitte Name, Kalorien und Menge eingeben')
      return
    }
    setApiLoading(true)
    try {
      const g = parseFloat(customAmount)
      const factor = 100 / g
      const kcal100 = parseFloat(customKcal) * factor
      const p100 = (parseFloat(customProtein) || 0) * factor
      const c100 = (parseFloat(customCarbs) || 0) * factor
      const f100 = (parseFloat(customFat) || 0) * factor

      const newFood = await axios.post(API_BASE + '/foods', {
        name: customName,
        brand: 'Manuell',
        calories_per_100g: kcal100,
        protein_per_100g: p100,
        carbs_per_100g: c100,
        fat_per_100g: f100,
      })

      await axios.post(API_BASE + '/logs?user_id=' + activeUser, {
        food_item_id: newFood.data.id,
        amount_grams: g,
      })

      setSuccess(customName + ' dauerhaft gespeichert & eingetragen!')
      setCustomName('')
      setCustomKcal('')
      setCustomProtein('')
      setCustomCarbs('')
      setCustomFat('')
      setCustomAmount('')
      setShowAddManual(false)
      loadFoods()
      await loadDashboard()
    } catch (err) {
      setError('Fehler beim Erstellen')
    } finally {
      setApiLoading(false)
    }
  }

  const handleOpenEditGoals = () => {
    setGoalInputKcal(macroGoals.calories)
    setGoalInputProtein(macroGoals.protein)
    setGoalInputCarbs(macroGoals.carbs)
    setGoalInputFat(macroGoals.fat)
    setShowEditGoals(true)
  }

  const handleSaveGoals = (e) => {
    e.preventDefault()
    const newGoals = {
      calories: parseInt(goalInputKcal, 10) || DEFAULT_GOALS.calories,
      protein: parseInt(goalInputProtein, 10) || DEFAULT_GOALS.protein,
      carbs: parseInt(goalInputCarbs, 10) || DEFAULT_GOALS.carbs,
      fat: parseInt(goalInputFat, 10) || DEFAULT_GOALS.fat,
    }
    setMacroGoals(newGoals)
    localStorage.setItem('macro_goals_user_' + activeUser, JSON.stringify(newGoals))
    setShowEditGoals(false)
    setSuccess('Tagesziele erfolgreich aktualisiert!')
  }

  const handleOpenEditName = () => {
    setNameInput(currentUser.name)
    setShowEditName(true)
  }

  const handleSaveName = (e) => {
    e.preventDefault()
    if (!nameInput.trim()) return
    const updatedName = nameInput.trim()
    localStorage.setItem('user_custom_name_' + activeUser, updatedName)
    setUserNames(prev => prev.map(u => u.id === activeUser ? { ...u, name: updatedName } : u))
    setShowEditName(false)
    setSuccess('Name erfolgreich in ' + updatedName + ' geändert!')
  }

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Eintrag löschen?')) return
    try {
      await axios.delete(API_BASE + '/logs/' + logId)
      setSuccess('Eintrag gelöscht')
      await loadDashboard()
    } catch (err) {
      setError('Fehler beim Löschen')
    }
  }

  const currentUser = userNames.find(u => u.id === activeUser)

  if (loading && !totals) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-center font-bold text-xl">Lade Cockpit...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-32 px-4 pt-4 safe-top safe-bottom relative selection:bg-pink-500 selection:text-white flex flex-col">
      
      <div className="flex-grow">
        <div className="fixed top-4 left-4 right-4 z-50 space-y-2">
          {error && <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-2xl font-bold text-center">⚠️ {error}</div>}
          {success && <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-2xl font-bold text-center">✓ {success}</div>}
        </div>

        <div className="mb-6 bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
              👥 Aktiver Benutzer
            </label>
            <button 
              onClick={handleOpenEditName}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-cyan-400 px-3 py-1 rounded-xl font-bold border border-slate-600 shadow transition-all active:scale-95"
            >
              ✏️ Name ändern
            </button>
          </div>
          <div className="relative">
            <select
              value={activeUser}
              onChange={(e) => setActiveUser(parseInt(e.target.value, 10))}
              className={'w-full appearance-none bg-gradient-to-r ' + currentUser.color + ' text-white font-black text-lg py-4 px-5 rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-white/20 outline-none border border-slate-600 cursor-pointer'}
            >
              {userNames.map((user) => (
                <option key={user.id} value={user.id} className="bg-slate-800 text-white font-bold py-2">
                  👤 {user.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-6 text-white">
              <span className="text-xl font-bold">▼</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className={'w-3 h-3 rounded-full bg-gradient-to-r ' + currentUser.color + ' animate-ping'} />
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {currentUser.name}s Cockpit
              </h1>
            </div>
            <p className="text-sm text-slate-400 font-bold mt-1">
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowScanner(true)}
              className="h-14 px-5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-black shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              📷 Scanner
            </button>
          </div>
        </div>

        {totals && (
          <>
            <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700 mb-6 relative overflow-hidden">
              <div className={'absolute -right-16 -top-16 w-48 h-48 bg-gradient-to-br ' + currentUser.color + ' opacity-20 rounded-full blur-3xl pointer-events-none'} />
              
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-slate-400 text-xs uppercase tracking-widest font-black">Kalorienübersicht</h2>
                <button 
                  onClick={handleOpenEditGoals}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-amber-400 px-3 py-1.5 rounded-xl font-black shadow border border-slate-600"
                >
                  ⚙️ Ziele ändern
                </button>
              </div>
              
              <div className="flex items-end gap-2 mb-4">
                <span className="text-6xl font-black tracking-tight text-white">{Math.round(totals.total_calories || 0)}</span>
                <span className="text-slate-400 font-black mb-1.5 text-base">/ {macroGoals.calories} kcal</span>
              </div>
              
              <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                <div className="flex justify-between text-xs font-black text-slate-300 mb-2">
                  <span>Fortschritt</span>
                  <span>{Math.round(((totals.total_calories || 0) / macroGoals.calories) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div 
                    className={'bg-gradient-to-r ' + currentUser.color + ' h-full rounded-full transition-all duration-1000 ease-out'}
                    style={{ width: Math.min(((totals.total_calories || 0) / macroGoals.calories) * 100, 100) + '%' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-5 shadow-lg flex flex-col items-center">
                <span className="text-xs text-blue-400 font-black uppercase tracking-widest mb-3">🔷 Protein</span>
                <div className="text-2xl font-black text-white">{Math.round(totals.total_protein || 0)}g <span className="text-sm font-normal text-slate-500">/ {macroGoals.protein}g</span></div>
                <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: Math.min((totals.total_protein / macroGoals.protein) * 100, 100) + '%' }} />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-5 shadow-lg flex flex-col items-center">
                <span className="text-xs text-amber-400 font-black uppercase tracking-widest mb-3">🔶 Kohlenhydrate</span>
                <div className="text-2xl font-black text-white">{Math.round(totals.total_carbs || 0)}g <span className="text-sm font-normal text-slate-500">/ {macroGoals.carbs}g</span></div>
                <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all duration-700" style={{ width: Math.min((totals.total_carbs / macroGoals.carbs) * 100, 100) + '%' }} />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-5 shadow-lg flex flex-col items-center">
                <span className="text-xs text-rose-400 font-black uppercase tracking-widest mb-3">❤️ Fett</span>
                <div className="text-2xl font-black text-white">{Math.round(totals.total_fat || 0)}g <span className="text-sm font-normal text-slate-500">/ {macroGoals.fat}g</span></div>
                <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-rose-500 h-full transition-all duration-700" style={{ width: Math.min((totals.total_fat / macroGoals.fat) * 100, 100) + '%' }} />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-black text-white pl-1">Heute verzehrt</h2>
          {logs.length === 0 ? (
            <div className="bg-slate-800/50 rounded-3xl border border-slate-700 text-center py-12 shadow-inner">
              <span className="text-4xl block mb-2">🍽️</span>
              <p className="text-slate-400 font-medium text-sm">Noch keine Einträge für diesen Benutzer heute.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-md">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-base">{log.food_name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs">
                      <span className="bg-slate-900 text-amber-400 font-black px-2 py-0.5 rounded-md">{log.amount_grams}g</span>
                      <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded-md">{Math.round(log.calories)} kcal</span>
                      <span className="text-blue-400">P: {log.protein.toFixed(1)}g</span>
                      <span className="text-amber-400">C: {log.carbs.toFixed(1)}g</span>
                      <span className="text-rose-400">F: {log.fat.toFixed(1)}g</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteLog(log.id)}
                    className="w-9 h-9 rounded-xl bg-slate-900 text-rose-500 hover:bg-rose-950 flex items-center justify-center font-bold transition-all ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Die Footer-Signatur */}
      <div className="mt-12 mb-4 text-center">
        <p className="text-xs font-medium text-slate-500">
          Created with ⚡ by <span className="font-black text-slate-400 hover:text-white transition-colors cursor-pointer">CrashBandit82</span>
        </p>
      </div>

      <button 
        onClick={() => { setSelectedFood(null); setShowAddManual(true); }}
        className={'fixed bottom-8 right-6 w-16 h-16 bg-gradient-to-r ' + currentUser.color + ' text-white rounded-full shadow-2xl flex items-center justify-center text-3xl font-black hover:scale-110 active:scale-95 transition-all z-30'}
      >
        +
      </button>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showEditName && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-md rounded-3xl p-6 border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-4">👤 Namen anpassen</h2>
            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Profil Name eingeben</label>
                <input 
                  type="text" 
                  value={nameInput} 
                  onChange={e => setNameInput(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500 text-lg" 
                  placeholder="z.B. Max Mustermann"
                  maxLength="20"
                  required 
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditName(false)} className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl">Abbrechen</button>
                <button type="submit" className={'flex-1 bg-gradient-to-r ' + currentUser.color + ' text-white font-black py-3 rounded-xl shadow-lg'}>Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditGoals && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-md rounded-3xl p-6 border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-4">🎯 Tagesziele für {currentUser.name}</h2>
            <form onSubmit={handleSaveGoals} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kalorienziel (kcal)</label>
                <input type="number" value={goalInputKcal} onChange={e => setGoalInputKcal(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Protein (g)</label>
                <input type="number" value={goalInputProtein} onChange={e => setGoalInputProtein(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kohlenhydrate (g)</label>
                <input type="number" value={goalInputCarbs} onChange={e => setGoalInputCarbs(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Fett (g)</label>
                <input type="number" value={goalInputFat} onChange={e => setGoalInputFat(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditGoals(false)} className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl">Abbrechen</button>
                <button type="submit" className={'flex-1 bg-gradient-to-r ' + currentUser.color + ' text-white font-black py-3 rounded-xl shadow-lg'}>Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddManual && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex items-end justify-center">
          <div className="bg-slate-800 w-full max-w-lg rounded-t-3xl p-6 shadow-2xl safe-bottom border-t border-slate-700 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-white">Mahlzeit hinzufügen</h2>
              <button onClick={() => setShowAddManual(false)} className="text-slate-400 text-xl font-bold p-1">✕</button>
            </div>

            {!selectedFood && (
              <div className="flex bg-slate-900 p-1 rounded-xl mb-4 border border-slate-700">
                <button 
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 py-2 rounded-lg font-black text-sm transition-all ${activeTab === 'search' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'}`}
                >
                  🔍 Lokale Liste suchen
                </button>
                <button 
                  onClick={() => setActiveTab('custom')}
                  className={`flex-1 py-2 rounded-lg font-black text-sm transition-all ${activeTab === 'custom' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'}`}
                >
                  ✍️ Komplett Frei eintragen
                </button>
              </div>
            )}

            {selectedFood ? (
              <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <h3 className="font-bold text-white text-lg">{selectedFood.name}</h3>
                  {selectedFood.brand && <p className="text-xs text-slate-400">{selectedFood.brand}</p>}
                  <p className="text-xs text-amber-400 font-bold mt-1">{Math.round(selectedFood.calories_per_100g)} kcal / 100g</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Menge in Gramm</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="z.B. 150"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-xl font-bold bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                </div>

                {amount && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 grid grid-cols-4 gap-2 text-center">
                    <div><p className="text-lg font-black text-white">{((selectedFood.calories_per_100g / 100) * parseFloat(amount)).toFixed(0)}</p><p className="text-[10px] text-slate-400 uppercase">kcal</p></div>
                    <div><p className="text-lg font-black text-blue-400">{((selectedFood.protein_per_100g / 100) * parseFloat(amount)).toFixed(1)}</p><p className="text-[10px] text-slate-400 uppercase">Prot</p></div>
                    <div><p className="text-lg font-black text-amber-400">{((selectedFood.carbs_per_100g / 100) * parseFloat(amount)).toFixed(1)}</p><p className="text-[10px] text-slate-400 uppercase">Khd</p></div>
                    <div><p className="text-lg font-black text-rose-400">{((selectedFood.fat_per_100g / 100) * parseFloat(amount)).toFixed(1)}</p><p className="text-[10px] text-slate-400 uppercase">Fett</p></div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setSelectedFood(null)} className="flex-1 bg-slate-700 text-white font-bold py-3.5 rounded-xl">Zurück</button>
                  <button onClick={handleAddMeal} disabled={!amount || apiLoading} className={'flex-1 bg-gradient-to-r ' + currentUser.color + ' text-white font-black py-3.5 rounded-xl'}>
                    {apiLoading ? 'Speichert...' : 'Eintragen'}
                  </button>
                </div>
              </div>
            ) : activeTab === 'search' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Lebensmittel aus Server-DB filtern..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1">
                  {foods
                    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(f => (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedFood(f); setAmount(''); }}
                        className="w-full bg-slate-900/60 border border-slate-700/60 hover:border-slate-500 rounded-xl p-3 text-left transition-all"
                      >
                        <div className="font-bold text-white text-sm">{f.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{Math.round(f.calories_per_100g)} kcal pro 100g</div>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCustomMeal} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mahlzeit Name</label>
                  <input type="text" placeholder="z.B. Große Pizza Salami" value={customName} onChange={e => setCustomName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Portion Gewicht (g)</label>
                    <input type="number" placeholder="z.B. 400" value={customAmount} onChange={e => setCustomAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kalorien gesamt (kcal)</label>
                    <input type="number" placeholder="z.B. 950" value={customKcal} onChange={e => setCustomKcal(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none" required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Protein gesamt (g)</label>
                    <input type="number" step="0.1" placeholder="Optional" value={customProtein} onChange={e => setCustomProtein(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kohlenh. gesamt (g)</label>
                    <input type="number" step="0.1" placeholder="Optional" value={customCarbs} onChange={e => setCustomCarbs(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fett gesamt (g)</label>
                    <input type="number" step="0.1" placeholder="Optional" value={customFat} onChange={e => setCustomFat(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                </div>
                <button type="submit" disabled={apiLoading} className={'w-full mt-3 bg-gradient-to-r ' + currentUser.color + ' text-white font-black py-3.5 rounded-xl shadow-lg'}>
                  {apiLoading ? 'Speichert...' : 'Dauerhaft in Server-DB speichern & eintragen'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
