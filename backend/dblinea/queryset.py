import collections

import pandas as pd
from astropy.table import Table


class Queryset(list):
    def to_pandas(self) -> pd.DataFrame:
        return pd.DataFrame(self)

    def to_astropy_table(self) -> Table:
        return Table(self)

    def to_dict(self):
        return [dict(collections.OrderedDict(item)) for item in self]
