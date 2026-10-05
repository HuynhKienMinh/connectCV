import {createContext,useContext,useEffect,useState} from 'react';
import {onIdTokenChanged,signOut} from 'firebase/auth';
import {auth} from '../lib/firebase';
const Context=createContext(null);
export function AuthProvider({children}){
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>onIdTokenChanged(auth,u=>{setUser(u);setLoading(false);}),[]);
 return <Context.Provider value={{user,loading,isLoggedIn:!!user,logout:()=>signOut(auth)}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
