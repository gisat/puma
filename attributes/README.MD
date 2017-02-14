# Units

## Without normalization

Default settings is for the unit to be displayed as percentage. This means that displayed units will be % and the values will be displayed multiplied by 100. 

It is possible to override the default setting by choosing normalization and setting the result in percentage to No. 

## Normalizations
 
 In every normalization there are at least two units that are in the play. The exact behavior differs based on the type of the normalization. 
 
### Area

 Everytime there is the area unit, attribute unit and possibly normalization units. Area unit is always square meters. Attribute unit can be either standard or non-standard and normalization units can be from the list: m2, ha, km2. The result can be also displayed in percentage. Percentage is applied on top of others and works the same as for not normalized.  
 
 Possible choices
 
 * Normalize over the area while having non standard unit for attribute and without normalization unit. In this case the result will be in {customUnit} / m2 and the value will be the same as in the database.
 * Normalize over the area while having standard unit for attribute and without normalization unit. In this case the result will be in {standardUnit} / m2 and the value will be multiplied by the factor of difference between standard units. If the attribute is in km2 then the value will be multiplied by 1 000 000.
 * Normalize over the area with standard units and with normalization units. In this case the result will be in normalization units and the value will be multiplied by the factor of difference between standard units. If the attribute is in km2 then the value will be multiplied by 1 000 000. Afterwards this number is divided by the factor of standard units / normalization units. In example where we normalize over the area on attribute with km2 and normalize it on ha. The value will be multiplied by 10 000 
 
### Attribute and Attribute set
 
 It is actually quite similar to the normalization over area. Only difference is that instead of m2 which represented the area, the units of normalization attribute will be used. 
 
 Possible choices
  
  * Normalize while having non standard unit for both attributes attribute and without normalization unit. In this case the result will be in {customSourceUnit} / {customNormalizationUnit} and the value will be the same as in the database. It is possible to get units to display m2/m2 here. 
  * Normalize while having standard unit for attribute and normalization attribute and without normalization unit. In this case the result will be in {standardSourceUnit} / {standardNormalizationUnit} and the value will be multiplied by the factor of difference between standard units. If the source attribute is in km2 and the result in m2 then the value will be multiplied by 1 000 000. If it is the other way round the value will be multiplied by 1 / 1 000 000
  * Normalize over the area with standard units, normalization attribute units and with normalization units. It works the same way as the previous one, the only difference is that  afterwards this number is divided by the factor of standard units / normalization units. In example where we normalize over the area on attribute with km2 and normalize it on ha. The value will be multiplied by 10 000 