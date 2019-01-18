update urban_gadm_2 set urban_2015 =
  (Select SUM(urban_2015) FROM urban_gadm_3
    WHERE urban_gadm_3.parent_id = urban_gadm_2.id_adm and urban_2015 is not null);

update urban_gadm_2 set non_urban_2015 =
  (Select SUM(non_urban_2015) FROM urban_gadm_3
    WHERE urban_gadm_3.parent_id = urban_gadm_2.id_adm and non_urban_2015 is not null);

update urban_gadm_1 set urban_2015 =
  (Select SUM(urban_2015) FROM urban_gadm_2
    WHERE urban_gadm_2.parent_id = urban_gadm_1.id_adm and urban_2015 is not null);

update urban_gadm_1 set non_urban_2015 =
  (Select SUM(non_urban_2015) FROM urban_gadm_2
    WHERE urban_gadm_2.parent_id = urban_gadm_1.id_adm and non_urban_2015 is not null);

update urban_gadm_0 set urban_2015 =
  (Select SUM(urban_2015) FROM urban_gadm_1
    WHERE urban_gadm_1.parent_id = urban_gadm_0.id_adm and urban_2015 is not null);

update urban_gadm_0 set non_urban_2015 =
  (Select SUM(non_urban_2015) FROM urban_gadm_1
    WHERE urban_gadm_1.parent_id = urban_gadm_0.id_adm and non_urban_2015 is not null);