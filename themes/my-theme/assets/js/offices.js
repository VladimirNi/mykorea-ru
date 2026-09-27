// Progressive enhancement: Hugo renders every public card; filtering stays local.
const directory = document.querySelector('[data-office-directory]');
if (directory) {
  const form = directory.querySelector('form');
  const panel = directory.querySelector('[data-filters]');
  const count = directory.querySelector('[data-result-count]');
  const empty = directory.querySelector('[data-empty]');
  const keys = ['q', 'city', 'district', 'age', 'gender', 'overtime', 'special_shifts', 'daily_pay'];
  const controls = Object.fromEntries(keys.map(key => [key, form.elements.namedItem(key)]));
  const districts = [...controls.district.options].map(option => option.cloneNode(true));
  const normalize = text => String(text).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  const offices = [...directory.querySelectorAll('[data-office]')].map(element => ({
    element,
    search: normalize(element.dataset.search),
    profiles: JSON.parse(element.dataset.profiles),
    rows: [...element.querySelectorAll('[data-profile]')]
  }));
  const mobile = matchMedia('(max-width: 640px)');
  panel.open = !mobile.matches;
  mobile.addEventListener('change', event => { panel.open = !event.matches; });

  function updateDistricts() {
    const selected = controls.district.value;
    controls.district.replaceChildren(...districts.filter(option => !option.value || !controls.city.value || option.dataset.city === controls.city.value).map(option => option.cloneNode(true)));
    controls.district.value = [...controls.district.options].some(option => option.value === selected) ? selected : '';
  }
  function restore() {
    const query = new URL(location.href).searchParams;
    controls.city.value = query.get('city') || '';
    updateDistricts();
    for (const key of keys.filter(key => key !== 'city')) {
      controls[key].value = (query.get(key) || '').slice(0, key === 'q' ? 100 : 80);
      if (!controls[key].validity.valid) controls[key].value = '';
    }
    apply(false);
  }
  function apply(writeURL = true) {
    if (!form.checkValidity()) return;
    const filters = Object.fromEntries(keys.map(key => [key, controls[key].value.trim()]));
    const age = Number(filters.age);
    const features = ['overtime', 'special_shifts', 'daily_pay'];
    const profileFilter = Boolean(filters.age || filters.gender || features.some(key => filters[key]));
    const matchesProfile = profile => {
      // An unknown age range cannot affirm eligibility. A single bound is open-ended.
      if (filters.age && ((!profile.age_min && !profile.age_max) || (profile.age_min && age < profile.age_min) || (profile.age_max && age > profile.age_max))) return false;
      if (filters.gender && profile.gender !== filters.gender && !(filters.gender !== 'any' && profile.gender === 'any')) return false;
      return features.every(key => !filters[key] || profile[key] === filters[key]);
    };
    const terms = normalize(filters.q).split(' ').filter(Boolean);
    let found = 0;
    for (const office of offices) {
      const matching = office.profiles.map(matchesProfile);
      const visible = (!filters.city || office.element.dataset.city === filters.city)
        && (!filters.district || office.element.dataset.district === filters.district)
        && terms.every(term => office.search.includes(term))
        && (!profileFilter || matching.some(Boolean));
      office.element.hidden = !visible;
      if (visible) found++;
      office.rows.forEach((row, index) => { row.hidden = profileFilter && !matching[index]; });
      const details = office.element.querySelector('.office-conditions');
      if (details) {
        details.querySelector('[data-profile-count]').textContent = String(profileFilter ? matching.filter(Boolean).length : matching.length);
        if (profileFilter && visible) details.open = true;
      }
    }
    count.textContent = String(found);
    empty.hidden = found > 0;
    if (writeURL) {
      const url = new URL(location.href);
      for (const key of keys) {
        if (filters[key]) url.searchParams.set(key, filters[key]);
        else url.searchParams.delete(key);
      }
      // Filtering does not create extra Back steps. Keep unrelated query parameters.
      history.replaceState(history.state, '', url);
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); apply(); });
  let timer;
  form.addEventListener('input', event => {
    clearTimeout(timer);
    if (event.target.name === 'city') updateDistricts();
    if (event.target.name === 'q') timer = setTimeout(() => apply(), 120);
    else apply();
  });
  form.addEventListener('reset', event => {
    event.preventDefault();
    clearTimeout(timer);
    for (const key of keys) controls[key].value = '';
    updateDistricts();
    apply();
  });
  addEventListener('popstate', restore);
  addEventListener('pageshow', restore);
  restore();
  panel.hidden = false;
}
