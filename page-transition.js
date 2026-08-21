// page-transition.js — fade smooth între pagini
// Rulează sincron în <head> (fără defer/module) ca să ascundă pagina înainte de render

;(function () {
  var d = document.documentElement
  d.style.opacity = '0'
  d.style.transition = 'opacity 0.22s ease'

  // Arată pagina la load (și la revenire din bfcache cu butonul Back)
  window.addEventListener('pageshow', function () {
    d.style.opacity = '1'
  })

  // Fade-out înainte de navigare internă
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]')
    if (!a) return
    var href = a.getAttribute('href')
    if (
      !href ||
      href.charAt(0) === '#' ||
      href.indexOf('://') !== -1 ||
      href.indexOf('mailto:') === 0 ||
      href.indexOf('tel:') === 0 ||
      href.indexOf('javascript') === 0 ||
      a.target === '_blank' ||
      e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
    ) return
    e.preventDefault()
    d.style.opacity = '0'
    setTimeout(function () { location.href = href }, 230)
  }, true)
})()
