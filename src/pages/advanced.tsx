import React from 'react';

import cockpit from 'cockpit';

import { ListingTable } from 'cockpit-components-table.jsx';
import { useBootKitContext } from '../state/bootkit_provider';

const _ = cockpit.gettext;

export const AdvancedValues = () => {
    const context = useBootKitContext();
    // TODO: separate view for advanced values for each config
    // TODO: advanced values editina and saving
    return (
        <ListingTable
            aria-label={_("GRUB values")}
            gridBreakPoint='grid-lg'
            columns={[
                { title: _("Key") },
                { title: _("Value") },
            ]}
            rows={(context.configsRaw.configs[0]?.file.values || []).map((kv) => {
                return {
                    columns: [
                        { title: kv[0] },
                        { title: kv[1] },
                    ]
                };
            })}
        />
    );
};
