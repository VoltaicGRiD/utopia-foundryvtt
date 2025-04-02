export function registerHandlebarsSettings() {
  Handlebars.registerHelper("toLowerCase", function (str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper("toUpperCase", function (str) {
    return str.toUpperCase();
  });

  Handlebars.registerHelper("toTitleCase", function (str) {
    return str.split(" ").map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(" ");
  });
  
  Handlebars.registerHelper("capitalize", function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
  
  Handlebars.registerHelper("for", function(n, block) {
    var accum = '';
    for(var i = 0; i < n; ++i)
        accum += block.fn(i);
    return accum;
  });
  
  Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
    return arg1 == arg2 ? options.fn(this) : options.inverse(this);
  });
  
  Handlebars.registerHelper("select", function (value, options) {
    var $el = $("<select />").html(options.fn(this));
    $el.find('[value="' + value + '"]').attr({ selected: "selected" });
    return $el.html();
  });
  
  Handlebars.registerHelper("capitalize", function (value) {
    return value.capitalize();
  })

  Handlebars.registerHelper("length", function (value) {
    return value.length;
  })

  Handlebars.registerHelper("for", function (n, block) {
    var accum = '';
    for(var i = 0; i < n; ++i)
        accum += block.fn(i);
    return accum;
  });
}