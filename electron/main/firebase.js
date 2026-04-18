import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCEQ-Ms3UW_ZoKu4Lp7z0Ll2-UhXKgmRKU",
  authDomain: "tfclab-multichat.firebaseapp.com",
  projectId: "tfclab-multichat",
  storageBucket: "tfclab-multichat.firebasestorage.app",
  messagingSenderId: "969823437078",
  appId: "1:969823437078:web:a4406eae979799ba009037"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

export async function validateLicenseRemote(key, hwid) {
  console.log("[FIREBASE] Iniciando validación para:", key)
  try {
    // 1. Auth check
    if (!auth.currentUser) {
      console.log("[FIREBASE] Autenticando anónimamente...")
      await signInAnonymously(auth)
      console.log("[FIREBASE] Autenticado con éxito.")
    }

    // 2. Fetch license doc
    console.log("[FIREBASE] Consultando Firestore...")
    const docRef = doc(db, "licenses", key)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return { success: false, error: "Llave de activación no existe." }
    }

    const data = docSnap.data()

    // 3. Status check
    if (data.status !== 'active') {
      return { success: false, error: "Esta llave ha sido revocada o está inactiva." }
    }

    // 4. HWID Binding check
    if (!data.hwid) {
      // First time activation: Bind to this HWID
      await updateDoc(docRef, {
        hwid: hwid,
        activatedAt: new Date().toISOString()
      })
      return { success: true, message: "Licencia activada y vinculada con éxito." }
    }

    if (data.hwid === hwid) {
      return { success: true }
    }

    return { success: false, error: "Esta llave ya está vinculada a otro equipo." }

  } catch (error) {
    console.error("Firebase Auth/Firestore Error:", error)
    return { success: false, error: "Error de conexión con el servidor de licencias." }
  }
}
