import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  'https://gxavdytkcukxnvonasur.supabase.co',  
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YXZkeXRrY3VreG52b25hc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzUzOTgsImV4cCI6MjA2OTQ1MTM5OH0.n2vXj6iziz3896EpzhjOotTuveqd7GjIhgAuExCOLW8'
);


export async function registerUser() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert('Eroare la înregistrare: ' + error.message);
  } else {
    alert('Cont creat cu succes!');
  }
}

export async function loginUser() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert('Eroare la autentificare: ' + error.message);
  } else {
    alert('Autentificare reușită!');
  }
}



