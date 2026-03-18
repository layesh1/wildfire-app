function googleTranslateElementInit() {
  // Create the div ourselves so React never owns or reconciles it
  var div = document.createElement('div');
  div.id = 'google_translate_element';
  div.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden';
  document.body.appendChild(div);
  new google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false,
    },
    'google_translate_element'
  );
}
