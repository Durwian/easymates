'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const totesLesTaules = [1,2,3,4,5,6,7,8,9];
  let nivellActual = 1, exercicis = [], partsModel = [100,30,2], factorActual = 132, multiplicadorActual = 6, installPrompt = null;

  // El service worker només es pot registrar des d'un origen segur (HTTPS o localhost).
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(e => console.warn('Error registrant el service worker:', e)));
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('boto-install').hidden = false; });
  $('boto-install').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('boto-install').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('boto-install').hidden = true; });

  const formTaules = $('formulari-taules');
  const taulesSeleccionades = () => [...formTaules.querySelectorAll('input[name="taula"]:checked')].map(x => Number(x.value));
  const taulesActives = () => taulesSeleccionades().length ? taulesSeleccionades() : totesLesTaules;
  function actualitzarEstat() {
    const t = taulesSeleccionades();
    $('estat-taules').textContent = t.length ? `Taules triades: ${t.join(', ')}.` : 'No n’has triat cap: s’utilitzaran les taules de l’1 al 9.';
  }
  try {
    const guardades = JSON.parse(localStorage.getItem('multiplicacions-taules') || 'null');
    if (Array.isArray(guardades)) formTaules.querySelectorAll('input[name="taula"]').forEach(x => x.checked = guardades.includes(Number(x.value)));
  } catch (_) {}
  actualitzarEstat();
  formTaules.addEventListener('change', actualitzarEstat);
  formTaules.addEventListener('submit', e => {
    e.preventDefault();
    try { localStorage.setItem('multiplicacions-taules', JSON.stringify(taulesSeleccionades())); } catch (_) {}
    actualitzarEstat(); $('estat-taules').textContent = 'Selecció desada. ' + $('estat-taules').textContent;
    if (!$('zona-exercicis').hidden) generarExercicis();
    crearModel();
  });

  const aleatori = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
  function nouExercici() {
    const a = nivellActual === 1 ? aleatori(1,9) : nivellActual === 2 ? aleatori(10,99) : aleatori(100,999);
    const ts = taulesActives(), b = ts[aleatori(0,ts.length-1)];
    return {a,b,resultat:a*b};
  }
  function generarExercicis() {
    const vist = new Set(); exercicis = []; let intents = 0;
    while (exercicis.length < 3 && intents < 100) { const op = nouExercici(), key = `${op.a}x${op.b}`; if (!vist.has(key)) {vist.add(key);exercicis.push(op);} intents++; }
    while (exercicis.length < 3) exercicis.push(nouExercici());
    mostrarExercicis();
  }
  function mostrarExercicis() {
    const llista = $('llista-exercicis'); while(llista.firstChild) llista.removeChild(llista.firstChild); $('missatge-exercicis').textContent = '';
    exercicis.forEach((op,i) => {
      const card=document.createElement('article'); card.className='exercici';
      const title=document.createElement('h3'); title.textContent=`Exercici ${i+1}`;
      const operation=document.createElement('div'); operation.className='operacio-vertical';
      const top=document.createElement('div'); top.textContent=op.a;
      const bottom=document.createElement('div'); bottom.textContent=`× ${op.b}`; operation.append(top,bottom);
      const line=document.createElement('div'); line.className='linia-operacio';
      const input=document.createElement('input'); Object.assign(input,{type:'number',inputMode:'numeric',min:'0',step:'1',required:true,id:`resposta-${i}`,placeholder:'?'}); input.setAttribute('aria-label',`Resultat de l’exercici ${i+1}`);
      const feedback=document.createElement('p'); feedback.className='feedback'; feedback.id=`feedback-${i}`;
      card.append(title,operation,line,input,feedback); llista.append(card);
    });
  }
  document.querySelectorAll('[data-nivell]').forEach(btn => btn.addEventListener('click', () => {
    nivellActual=Number(btn.dataset.nivell);
    $('titol-exercicis').textContent=['','Nivell 1 · Una xifra × una xifra','Nivell 2 · Dues xifres × una xifra','Nivell 3 · Tres xifres × una xifra'][nivellActual];
    $('zona-exercicis').hidden=false; generarExercicis(); $('zona-exercicis').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  $('formulari-exercicis').addEventListener('submit',e => {
    e.preventDefault(); let correctes=0;
    exercicis.forEach((op,i) => {
      const input=$(`resposta-${i}`), feedback=$(`feedback-${i}`), ok=input.value.trim()!=='' && Number(input.value)===op.resultat;
      input.classList.toggle('correcte',ok); input.classList.toggle('incorrecte',!ok);
      feedback.textContent=ok?'🎉 Molt bé! Correcte!':'Torna-ho a provar.';
      feedback.classList.toggle('text-correcte',ok); feedback.classList.toggle('text-incorrecte',!ok); if(ok) correctes++;
    });
    $('missatge-exercicis').textContent=correctes===3?'🏆 Excel·lent! Les tres respostes són correctes!':`Has encertat ${correctes} de 3. Pots corregir les respostes!`;
  });
  $('boto-noves').addEventListener('click',generarExercicis);

  function crearModel() {
    const factor=Number($('factor-model').value), mult=Number($('multiplicador-model').value);
    if(!Number.isInteger(factor)||factor<1||factor>999||!Number.isInteger(mult)||mult<1||mult>9){
      $('missatge-model').textContent='Introdueix un nombre de l’1 al 999 i un multiplicador de l’1 al 9.'; $('missatge-model').className='missatge text-incorrecte'; return;
    }
    factorActual=factor; multiplicadorActual=mult;
    partsModel=[Math.floor(factor/100)*100,Math.floor((factor%100)/10)*10,factor%10];
    $('missatge-model').textContent=''; $('missatge-model').className='missatge'; while($('model-visual').firstChild) $('model-visual').removeChild($('model-visual').firstChild);
    const table=document.createElement('div'); table.className='taula-rectangular';
    const multiplier=document.createElement('div'); multiplier.className='factor-vertical'; multiplier.textContent=`× ${mult}`;
    const right=document.createElement('div'), header=document.createElement('div'); right.className='part-dreta-model'; header.className='capcalera-rectangular';
    ['Centenes','Desenes','Unitats'].forEach((name,i)=>{
      const cell=document.createElement('div'); cell.className='cel-la-capcalera';
      const label=document.createElement('span'); label.className='etiqueta-descomposicio'; label.textContent=name;
      const value=document.createElement('strong'); value.textContent=partsModel[i];
      cell.append(label,value); header.append(cell);
    });
    const row=document.createElement('div'); row.className='fila-resultats-model';
    partsModel.forEach((part,i)=>{
      const input=document.createElement('input'); Object.assign(input,{type:'number',inputMode:'numeric',min:'0',step:'1',id:`parcial-${i}`,placeholder:'?'});
      input.setAttribute('aria-label',`Producte de ${part} per ${mult}`); row.append(input);
      const sum=$(`suma${i+1}`); sum.value=''; sum.classList.remove('correcte','incorrecte');
    });
    right.append(header,row); table.append(multiplier,right); $('model-visual').append(table);
    const equation=document.createElement('p'); equation.className='operacio-model'; equation.textContent=`${factor} × ${mult} = ?`; $('model-visual').append(equation);
    $('resultat-model').value=''; $('resultat-model').classList.remove('correcte','incorrecte');
  }
  function comprovarModel() {
    const productes=partsModel.map(n=>n*multiplicadorActual); let cp=0,cs=0;
    partsModel.forEach((_,i)=>{
      const p=$(`parcial-${i}`), okp=p.value.trim()!==''&&Number(p.value)===productes[i];
      p.classList.toggle('correcte',okp);p.classList.toggle('incorrecte',!okp);if(okp)cp++;
      const s=$(`suma${i+1}`), oks=s.value.trim()!==''&&Number(s.value)===productes[i];
      s.classList.toggle('correcte',oks);s.classList.toggle('incorrecte',!oks);if(oks)cs++;
    });
    const final=$('resultat-model'), okf=final.value.trim()!==''&&Number(final.value)===factorActual*multiplicadorActual;
    final.classList.toggle('correcte',okf);final.classList.toggle('incorrecte',!okf);
    const tot=cp===3&&cs===3&&okf;
    $('missatge-model').textContent=tot?'🏆 Fantàstic! Has resolt el model rectangular!':`Productes parcials: ${cp}/3. Suma: ${cs}/3. Resultat final: ${okf?'correcte':'revisa’l'}.`;
    $('missatge-model').className=`missatge ${tot?'text-correcte':''}`;
  }
  $('boto-model').addEventListener('click',crearModel);
  $('nou-model').addEventListener('click',()=>{
    $('factor-model').value=aleatori(100,999); const ts=taulesActives();
    $('multiplicador-model').value=String(ts[aleatori(0,ts.length-1)]); crearModel();
  });
  $('comprovar-model').addEventListener('click',comprovarModel);
  crearModel();
});
