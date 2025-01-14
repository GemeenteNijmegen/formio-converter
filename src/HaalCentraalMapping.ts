export class HaalCentraalMapping {

  static readonly map: Record<string, string> = {
    straatnaam: 'verblijfplaats.woonplaats',
    naam: 'verblijfplaats.huisnummer',
    huisnummer: 'verblijfplaats.huisnummer',
    postcode: 'verblijfplaats.huisnummer',
    woonplaats: 'verblijfplaats.huisnummer',
    // TODO check and finish mapping
  };

  /**
   * Cenerate a BRP prefill configuration for this component
   * @param component
   * @returns
   */
  static getPrefillConfiguration(component: any) {
    const searchString: string = component.label + component.customClass + component.key;
    for (const key of Object.keys(HaalCentraalMapping.map)) {
      const match = searchString.toLowerCase().includes(key);
      if (!match) {
        continue;
      }
      return {
        plugin: 'haalcentraal',
        attribute: HaalCentraalMapping.map[key],
        identifierRole: 'main',
      };
    }
    return undefined;
  }
}