/**
 * map.js uses leaflet to render the geojson file.
 * Hooks into a div with id "map" to render the map.
 * Leaflet is currently brought in from the headers in the layout in the extraheaders section.
 * 
 * Use attributes data-[lat, lng, zoom, data-path, vars, choropleth-var, choropleth-grades] to customize map
 * vars is a JSON string array
 * choropleth-grades is a JSON number array with 5 variables
 * Ex: <div id="map" lat="-16.2902" lng="-63.5887" zoom="6" dataPath="/data/GeoDS4Bolivia.geojson"></div>
 */

const mapElement = document.getElementById("map");

const lat = Number(mapElement.getAttribute("data-lat"));
const lng = Number(mapElement.getAttribute("data-lng"));
const zoom = parseInt(mapElement.getAttribute("data-zoom"));
const dataPath = mapElement.getAttribute("data-path");
const vars = JSON.parse(mapElement.getAttribute("data-vars"));
const choroplethVar = mapElement.getAttribute("data-choropleth-var");
const choroplethGrades = JSON.parse(mapElement.getAttribute("data-choropleth-grades")).map(Number);

const getColor = d => {
  // Colors taken from plasma color map 
  const colors = ['#f0f921', '#f89640', '#cc4878', '#7e04a8', '#0d0887'];

  for (let i = choroplethGrades.length - 1; i >= 0; i--) {
    if (d > choroplethGrades[i]) return colors[i];
  }

  return '#ffffff';
};

const map = L.map("map", {
  center: L.latLng(lat, lng),
  zoom: zoom,
  layers: [L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  })]
});

const tooltip = L.tooltip({
  sticky: true,
  className: 'py-1 px-2 bg-neutral-0 bg-opacity-80 shadow rounded',
  opacity: 0.95
});

(() => {
  const info = L.control({position: 'topright'});
  const div = L.DomUtil.create('div', 'py-1 px-2 bg-neutral-0 bg-opacity-80 shadow rounded');

  info.onAdd = () => {
    div.innerHTML = `Choropleth on <b>${choroplethVar}</b>`;
    return div;
  }
  
  info.addTo(map);
})();

(() => {
  const legend = L.control({position: 'bottomright'});
  const div = L.DomUtil.create('div', 'py-1 px-2 bg-neutral-0 leading-5 bg-opacity-80 shadow rounded text-neutral-600');

  const updateLegend = grades => {
    div.innerHTML = "";

    for (var i = 0; i < grades.length - 1; i++) {
      div.innerHTML +=
          `<i class="w-5 h-5 float-left mr-2 opacity-70" style="background: ${getColor(grades[i] + 1)}"></i>${grades[i]}&ndash;${grades[i + 1]}<br>`;
    }
  }

  legend.onAdd = () => {
      updateLegend(choroplethGrades);
      return div;
  };
  
  legend.addTo(map);
})();

fetch(dataPath)
  .then(response => response.json())
  .then(data => {
    let geoJson;

    const style = feature => {
        return {
            fillColor: getColor(feature.properties[choroplethVar]),
            weight: 1.5,
            opacity: 0.7,
            color: '#ddd',
            dashArray: '2',
            fillOpacity: 0.7
        };
    }

    const onEachFeature = (feature, layer) => {
      const resetHighlight = e => {
        geoJson.resetStyle(e.target);
      }
    
      const highlightFeature = e => {
        const layer = e.target;
    
        layer.setStyle({
            weight: 5,
            color: 'gray',
            dashArray: '',
            fillOpacity: 0.7
        });

        layer.bringToFront();

        let tooltipHtml = `<table class="border-separate border-spacing-1" >`;

        for (let variable of vars) {
          tooltipHtml += 
          `
          <tr>
            <td><b>${variable}<b></td>
            <td>${feature.properties[variable]}</td>
          </tr>
          `
        }

        tooltipHtml += `</table>`;
        
        layer.getTooltip().setContent(tooltipHtml);
      }
    
      const zoomToFeature = e => {
        map.fitBounds(e.target.getBounds());
      }

      layer.bindTooltip(tooltip);
    
      layer.on({
          mouseover: highlightFeature,
          mouseout: resetHighlight,
          click: zoomToFeature
      });
    }
    
    geoJson = L.geoJson(data, {
      style: style,
      onEachFeature: onEachFeature,
      pointToLayer: (feature, latlng) => L.circleMarker(latlng)
    }).addTo(map);
  });
